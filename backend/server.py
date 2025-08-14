from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal, Dict
import uuid
from datetime import datetime, timedelta
import hashlib
import jwt
from bson import ObjectId
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"User {user_id} connected to WebSocket")
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
                return True
            except:
                self.disconnect(user_id)
                return False
        return False

manager = ConnectionManager()

# Create the main app without a prefix
app = FastAPI(title="Orange Bus API", description="Ride-sharing and Delivery app for Anbar Governorate")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# =====================================================
# MODELS
# =====================================================

class UserType(str):
    PASSENGER = "passenger"
    DRIVER = "driver"

class ServiceType(str):
    RIDE = "ride"
    DELIVERY = "delivery"

class RideStatus:
    REQUESTED = "requested"
    SCHEDULED = "scheduled"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class DeliveryStatus:
    REQUESTED = "requested"
    SCHEDULED = "scheduled"
    ACCEPTED = "accepted"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class RideType:
    IMMEDIATE = "immediate"
    SCHEDULED = "scheduled"
    OPEN_RIDE = "open_ride"

class DeliveryType:
    IMMEDIATE = "immediate"
    SCHEDULED = "scheduled"

class VehicleType:
    STANDARD = "standard"
    VIP = "vip"

class PackageSize:
    SMALL = "small"      # أقل من 5 كغ - مثل الوثائق والطعام
    MEDIUM = "medium"    # 5-15 كغ - مثل الملابس والإلكترونيات الصغيرة
    LARGE = "large"      # 15-30 كغ - مثل الأجهزة والأثاث الصغير

class MessageType:
    TEXT = "text"
    LOCATION = "location"
    SYSTEM = "system"

# User Models
class UserBase(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    user_type: Literal["passenger", "driver"]
    profile_image: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    rating: Optional[float] = None
    total_rides: int = 0
    total_deliveries: int = 0
    is_active: bool = True

class UserLogin(BaseModel):
    phone: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Enhanced Driver specific models
class DriverInfo(BaseModel):
    license_number: str
    car_model: str
    car_color: str
    car_plate: str
    car_image: Optional[str] = None
    vehicle_type: Literal["standard", "vip"] = "standard"
    is_available: bool = True
    max_passengers: int = 4
    amenities: List[str] = []
    # Delivery specific fields
    accepts_deliveries: bool = True
    max_package_size: Literal["small", "medium", "large"] = "medium"
    delivery_equipment: List[str] = []  # ["insulated_bag", "safety_equipment"]

class DriverResponse(UserResponse):
    driver_info: Optional[DriverInfo] = None

# Location Models
class Location(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

# Package Models
class PackageInfo(BaseModel):
    description: str
    size: Literal["small", "medium", "large"]
    weight_kg: Optional[float] = None
    fragile: bool = False
    requires_signature: bool = False
    special_instructions: Optional[str] = None
    declared_value: Optional[float] = None  # In IQD for insurance

class RecipientInfo(BaseModel):
    name: str
    phone: str
    notes: Optional[str] = None

# Enhanced Ride Models
class RideRequest(BaseModel):
    pickup_location: Location
    destination_location: Optional[Location] = None
    passenger_notes: Optional[str] = None
    ride_type: Literal["immediate", "scheduled", "open_ride"] = "immediate"
    vehicle_type: Literal["standard", "vip"] = "standard"
    scheduled_time: Optional[datetime] = None
    max_duration_minutes: Optional[int] = None

class RideResponse(BaseModel):
    id: str
    passenger_id: str
    driver_id: Optional[str] = None
    pickup_location: Location
    destination_location: Optional[Location] = None
    status: str
    ride_type: str
    vehicle_type: str
    created_at: datetime
    scheduled_time: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    estimated_fare: Optional[float] = None
    actual_fare: Optional[float] = None
    passenger_notes: Optional[str] = None
    driver_notes: Optional[str] = None
    passenger_info: Optional[UserResponse] = None
    driver_info: Optional[DriverResponse] = None
    duration_minutes: Optional[int] = None
    distance_km: Optional[float] = None

# Delivery Models
class DeliveryRequest(BaseModel):
    pickup_location: Location
    delivery_location: Location
    package_info: PackageInfo
    recipient_info: RecipientInfo
    sender_notes: Optional[str] = None
    delivery_type: Literal["immediate", "scheduled"] = "immediate"
    scheduled_time: Optional[datetime] = None
    preferred_delivery_time: Optional[str] = None  # "morning", "afternoon", "evening"

class DeliveryResponse(BaseModel):
    id: str
    sender_id: str
    driver_id: Optional[str] = None
    pickup_location: Location
    delivery_location: Location
    package_info: PackageInfo
    recipient_info: RecipientInfo
    status: str
    delivery_type: str
    created_at: datetime
    scheduled_time: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    sender_notes: Optional[str] = None
    driver_notes: Optional[str] = None
    sender_info: Optional[UserResponse] = None
    driver_info: Optional[DriverResponse] = None
    tracking_code: Optional[str] = None
    distance_km: Optional[float] = None
    proof_of_delivery: Optional[str] = None  # base64 image

# Rating Models
class RatingCreate(BaseModel):
    service_id: str  # Can be ride_id or delivery_id
    service_type: Literal["ride", "delivery"]
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class RatingResponse(BaseModel):
    id: str
    service_id: str
    service_type: str
    rater_id: str
    rated_user_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

# Chat Models (unified for rides and deliveries)
class MessageCreate(BaseModel):
    service_id: str
    service_type: Literal["ride", "delivery"]
    message_type: Literal["text", "location", "system"] = "text"
    content: str
    location_data: Optional[Location] = None

class MessageResponse(BaseModel):
    id: str
    service_id: str
    service_type: str
    sender_id: str
    sender_name: str
    sender_type: str
    message_type: str
    content: str
    location_data: Optional[Location] = None
    timestamp: datetime
    is_read: bool = False

class ChatResponse(BaseModel):
    service_id: str
    service_type: str
    participants: List[UserResponse]
    messages: List[MessageResponse]
    unread_count: int = 0

# Pricing Models
class VehiclePricing(BaseModel):
    vehicle_type: str
    base_fare: float
    rate_per_km: float
    rate_per_minute: float
    minimum_fare: float
    booking_fee: float = 0

class DeliveryPricing(BaseModel):
    package_size: str
    base_cost: float
    rate_per_km: float
    minimum_cost: float
    size_multiplier: float
    fragile_fee: float = 0
    signature_fee: float = 0
    insurance_rate: float = 0.01  # 1% of declared value

# =====================================================
# UTILITY FUNCTIONS
# =====================================================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hash: str) -> bool:
    return hashlib.sha256(password.encode()).hexdigest() == hash

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode = {"sub": user_id, "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def serialize_user(user: dict) -> dict:
    user["id"] = str(user["_id"])
    del user["_id"]
    if "password" in user:
        del user["password"]
    return user

def serialize_message(message: dict) -> dict:
    message["id"] = str(message["_id"])
    del message["_id"]
    return message

def generate_tracking_code() -> str:
    """Generate unique tracking code for deliveries"""
    import random
    import string
    return 'OB' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

async def get_vehicle_pricing(vehicle_type: str) -> VehiclePricing:
    """Get pricing for different vehicle types"""
    pricing_config = {
        "standard": VehiclePricing(
            vehicle_type="standard",
            base_fare=1000.0,
            rate_per_km=500.0,
            rate_per_minute=50.0,
            minimum_fare=1500.0,
            booking_fee=500.0
        ),
        "vip": VehiclePricing(
            vehicle_type="vip",
            base_fare=2000.0,
            rate_per_km=800.0,
            rate_per_minute=80.0,
            minimum_fare=3000.0,
            booking_fee=1000.0
        )
    }
    return pricing_config.get(vehicle_type, pricing_config["standard"])

async def get_delivery_pricing(package_size: str) -> DeliveryPricing:
    """Get delivery pricing based on package size"""
    pricing_config = {
        "small": DeliveryPricing(
            package_size="small",
            base_cost=1500.0,  # 1500 IQD base
            rate_per_km=300.0,  # 300 IQD per km
            minimum_cost=2000.0,
            size_multiplier=1.0,
            fragile_fee=500.0,
            signature_fee=300.0
        ),
        "medium": DeliveryPricing(
            package_size="medium",
            base_cost=2500.0,
            rate_per_km=400.0,
            minimum_cost=3000.0,
            size_multiplier=1.5,
            fragile_fee=800.0,
            signature_fee=500.0
        ),
        "large": DeliveryPricing(
            package_size="large",
            base_cost=4000.0,
            rate_per_km=600.0,
            minimum_cost=5000.0,
            size_multiplier=2.0,
            fragile_fee=1200.0,
            signature_fee=700.0
        )
    }
    return pricing_config.get(package_size, pricing_config["small"])

async def calculate_ride_fare(ride_data: dict, duration_minutes: int = None, distance_km: float = None) -> float:
    """Calculate fare based on ride type and vehicle type"""
    pricing = await get_vehicle_pricing(ride_data.get("vehicle_type", "standard"))
    
    if ride_data["ride_type"] == "open_ride":
        if duration_minutes:
            return max(pricing.minimum_fare, pricing.base_fare + (duration_minutes * pricing.rate_per_minute))
        return pricing.minimum_fare
    else:
        total_fare = pricing.base_fare
        
        if distance_km:
            total_fare += distance_km * pricing.rate_per_km
        
        if duration_minutes:
            total_fare += duration_minutes * pricing.rate_per_minute
        
        if ride_data["ride_type"] == "scheduled":
            total_fare += pricing.booking_fee
        
        return max(pricing.minimum_fare, total_fare)

async def calculate_delivery_cost(delivery_data: dict, distance_km: float = None) -> float:
    """Calculate delivery cost based on package and distance"""
    package_info = delivery_data.get("package_info", {})
    package_size = package_info.get("size", "small")
    
    pricing = await get_delivery_pricing(package_size)
    
    total_cost = pricing.base_cost
    
    if distance_km:
        total_cost += distance_km * pricing.rate_per_km
    
    # Add additional fees
    if package_info.get("fragile", False):
        total_cost += pricing.fragile_fee
    
    if package_info.get("requires_signature", False):
        total_cost += pricing.signature_fee
    
    # Add insurance if declared value exists
    declared_value = package_info.get("declared_value", 0) or 0
    if declared_value > 0:
        total_cost += declared_value * pricing.insurance_rate
    
    # Apply size multiplier
    total_cost *= pricing.size_multiplier
    
    return max(pricing.minimum_cost, total_cost)

# =====================================================
# WEBSOCKET ENDPOINT
# =====================================================

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Connected: {user_id}")
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# =====================================================
# AUTHENTICATION ENDPOINTS
# =====================================================

@api_router.post("/auth/register", response_model=Token)
async def register_user(user_data: UserCreate):
    existing_user = await db.users.find_one({"phone": user_data.phone})
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "name": user_data.name,
        "phone": user_data.phone,
        "email": user_data.email,
        "user_type": user_data.user_type,
        "profile_image": user_data.profile_image,
        "password": hashed_password,
        "created_at": datetime.utcnow(),
        "rating": None,
        "total_rides": 0,
        "total_deliveries": 0,
        "is_active": True
    }
    
    if user_data.user_type == "driver":
        user_doc["driver_info"] = {
            "license_number": "",
            "car_model": "",
            "car_color": "",
            "car_plate": "",
            "car_image": None,
            "vehicle_type": "standard",
            "is_available": False,
            "max_passengers": 4,
            "amenities": [],
            "accepts_deliveries": True,
            "max_package_size": "medium",
            "delivery_equipment": []
        }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    access_token = create_access_token(str(result.inserted_id))
    user_response = serialize_user(user_doc)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user_response)
    )

@api_router.post("/auth/login", response_model=Token)
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"phone": login_data.phone})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    if not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    access_token = create_access_token(str(user["_id"]))
    user_response = serialize_user(user)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user_response)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return UserResponse(**serialize_user(current_user))

# =====================================================
# USER MANAGEMENT ENDPOINTS
# =====================================================

@api_router.put("/users/profile", response_model=UserResponse)
async def update_user_profile(
    user_update: UserBase,
    current_user: dict = Depends(get_current_user)
):
    update_data = {
        "name": user_update.name,
        "phone": user_update.phone,
        "email": user_update.email,
        "profile_image": user_update.profile_image,
        "updated_at": datetime.utcnow()
    }
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    return UserResponse(**serialize_user(updated_user))

@api_router.put("/drivers/info", response_model=DriverResponse)
async def update_driver_info(
    driver_info: DriverInfo,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can update driver info")
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"driver_info": driver_info.dict(), "updated_at": datetime.utcnow()}}
    )
    
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    return DriverResponse(**serialize_user(updated_user))

@api_router.put("/drivers/availability")
async def toggle_driver_availability(
    is_available: bool,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can update availability")
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"driver_info.is_available": is_available, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Availability updated successfully", "is_available": is_available}

@api_router.get("/vehicle-types")
async def get_vehicle_types():
    """Get available vehicle types and their pricing"""
    standard_pricing = await get_vehicle_pricing("standard")
    vip_pricing = await get_vehicle_pricing("vip")
    
    return {
        "vehicle_types": [
            {
                "type": "standard",
                "name": "عادية",
                "description": "سيارة عادية مريحة",
                "base_fare": standard_pricing.base_fare,
                "rate_per_km": standard_pricing.rate_per_km,
                "rate_per_minute": standard_pricing.rate_per_minute,
                "features": ["مكيف هواء", "مقاعد مريحة"]
            },
            {
                "type": "vip",
                "name": "VIP",
                "description": "سيارة فاخرة مع خدمات إضافية",
                "base_fare": vip_pricing.base_fare,
                "rate_per_km": vip_pricing.rate_per_km,
                "rate_per_minute": vip_pricing.rate_per_minute,
                "features": ["مكيف هواء", "واي فاي", "مياه مجانية", "شاحن هاتف", "مقاعد جلدية"]
            }
        ]
    }

@api_router.get("/delivery/package-sizes")
async def get_package_sizes():
    """Get available package sizes and their pricing"""
    small_pricing = await get_delivery_pricing("small")
    medium_pricing = await get_delivery_pricing("medium")
    large_pricing = await get_delivery_pricing("large")
    
    return {
        "package_sizes": [
            {
                "size": "small",
                "name": "صغير",
                "description": "أقل من 5 كغ - وثائق، طعام، مواد صغيرة",
                "max_weight": 5,
                "base_cost": small_pricing.base_cost,
                "rate_per_km": small_pricing.rate_per_km,
                "examples": ["وثائق", "أدوية", "طعام", "مواد إلكترونية صغيرة"]
            },
            {
                "size": "medium",
                "name": "متوسط",
                "description": "5-15 كغ - ملابس، إلكترونيات متوسطة",
                "max_weight": 15,
                "base_cost": medium_pricing.base_cost,
                "rate_per_km": medium_pricing.rate_per_km,
                "examples": ["ملابس", "أحذية", "لابتوب", "كتب"]
            },
            {
                "size": "large",
                "name": "كبير",
                "description": "15-30 كغ - أجهزة، أثاث صغير",
                "max_weight": 30,
                "base_cost": large_pricing.base_cost,
                "rate_per_km": large_pricing.rate_per_km,
                "examples": ["أجهزة منزلية", "أثاث صغير", "معدات رياضية"]
            }
        ]
    }

# =====================================================
# RIDE MANAGEMENT ENDPOINTS
# =====================================================

@api_router.post("/rides/request", response_model=RideResponse)
async def request_ride(
    ride_request: RideRequest,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "passenger":
        raise HTTPException(status_code=403, detail="Only passengers can request rides")
    
    # Validation for different ride types
    if ride_request.ride_type == "scheduled":
        if not ride_request.scheduled_time:
            raise HTTPException(status_code=400, detail="Scheduled time is required for pre-booked rides")
        if ride_request.scheduled_time <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    
    if ride_request.ride_type == "open_ride":
        if not ride_request.max_duration_minutes:
            ride_request.max_duration_minutes = 480
    
    # Calculate estimated fare
    estimated_fare = await calculate_ride_fare({
        "ride_type": ride_request.ride_type,
        "vehicle_type": ride_request.vehicle_type
    })
    
    initial_status = RideStatus.SCHEDULED if ride_request.ride_type == "scheduled" else RideStatus.REQUESTED
    
    ride_doc = {
        "passenger_id": str(current_user["_id"]),
        "driver_id": None,
        "pickup_location": ride_request.pickup_location.dict(),
        "destination_location": ride_request.destination_location.dict() if ride_request.destination_location else None,
        "status": initial_status,
        "ride_type": ride_request.ride_type,
        "vehicle_type": ride_request.vehicle_type,
        "created_at": datetime.utcnow(),
        "scheduled_time": ride_request.scheduled_time,
        "estimated_fare": estimated_fare,
        "actual_fare": None,
        "passenger_notes": ride_request.passenger_notes,
        "driver_notes": None,
        "max_duration_minutes": ride_request.max_duration_minutes,
        "started_at": None,
        "ended_at": None,
        "duration_minutes": None,
        "distance_km": None
    }
    
    result = await db.rides.insert_one(ride_doc)
    ride_doc["_id"] = result.inserted_id
    
    passenger_info = serialize_user(current_user)
    response_data = serialize_user(ride_doc)
    response_data["passenger_info"] = UserResponse(**passenger_info)
    response_data["driver_info"] = None
    
    return RideResponse(**response_data)

@api_router.get("/rides/available", response_model=List[RideResponse])
async def get_available_rides(
    vehicle_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can view available rides")
    
    # Build query for available rides
    query = {
        "$or": [
            {"status": RideStatus.REQUESTED},
            {
                "status": RideStatus.SCHEDULED,
                "scheduled_time": {
                    "$lte": datetime.utcnow() + timedelta(minutes=30)
                }
            }
        ]
    }
    
    # Filter by vehicle type if specified
    if vehicle_type:
        query["vehicle_type"] = vehicle_type
    
    rides = await db.rides.find(query).to_list(50)
    
    result = []
    for ride in rides:
        passenger = await db.users.find_one({"_id": ObjectId(ride["passenger_id"])})
        
        ride_data = serialize_user(ride)
        ride_data["passenger_info"] = UserResponse(**serialize_user(passenger))
        ride_data["driver_info"] = None
        
        result.append(RideResponse(**ride_data))
    
    return result

@api_router.put("/rides/{ride_id}/accept")
async def accept_ride(ride_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can accept rides")
    
    # Check if ride exists and is available
    ride = await db.rides.find_one({
        "_id": ObjectId(ride_id), 
        "status": {"$in": [RideStatus.REQUESTED, RideStatus.SCHEDULED]}
    })
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found or not available")
    
    # Update ride with driver info
    await db.rides.update_one(
        {"_id": ObjectId(ride_id)},
        {
            "$set": {
                "driver_id": str(current_user["_id"]),
                "status": RideStatus.ACCEPTED,
                "accepted_at": datetime.utcnow()
            }
        }
    )
    
    # Send system message to chat
    await create_system_message(
        ride_id, 
        "ride",
        f"تم قبول طلب الرحلة من قبل السائق {current_user['name']}"
    )
    
    # Notify passenger via WebSocket
    passenger = await db.users.find_one({"_id": ObjectId(ride["passenger_id"])})
    if passenger:
        await manager.send_personal_message({
            "type": "ride_accepted",
            "ride_id": ride_id,
            "driver_name": current_user["name"],
            "driver_info": current_user.get("driver_info", {}),
            "message": "تم قبول طلب الرحلة الخاص بك!"
        }, str(passenger["_id"]))
    
    return {"message": "Ride accepted successfully"}

@api_router.put("/rides/{ride_id}/status")
async def update_ride_status(
    ride_id: str, 
    status: str,
    distance_km: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update ride status"""
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if str(current_user["_id"]) != ride.get("driver_id"):
        raise HTTPException(status_code=403, detail="Only the assigned driver can update ride status")
    
    valid_statuses = [RideStatus.IN_PROGRESS, RideStatus.COMPLETED, RideStatus.CANCELLED]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }
    
    if status == RideStatus.IN_PROGRESS:
        update_data["started_at"] = datetime.utcnow()
        await create_system_message(ride_id, "ride", "بدأت الرحلة")
    
    elif status == RideStatus.COMPLETED:
        update_data["ended_at"] = datetime.utcnow()
        
        # Calculate duration and final fare
        started_at = ride.get("started_at")
        if started_at:
            duration = datetime.utcnow() - started_at
            update_data["duration_minutes"] = int(duration.total_seconds() / 60)
        
        if distance_km:
            update_data["distance_km"] = distance_km
        
        # Calculate actual fare
        actual_fare = await calculate_ride_fare(
            ride, 
            update_data.get("duration_minutes"), 
            distance_km
        )
        update_data["actual_fare"] = actual_fare
        
        await create_system_message(
            ride_id, 
            "ride", 
            f"تمت الرحلة بنجاح. التكلفة النهائية: {actual_fare} د.ع"
        )
        
        # Update total rides count
        await db.users.update_one(
            {"_id": ObjectId(ride["passenger_id"])},
            {"$inc": {"total_rides": 1}}
        )
        
        await db.users.update_one(
            {"_id": ObjectId(ride["driver_id"])},
            {"$inc": {"total_rides": 1}}
        )
    
    elif status == RideStatus.CANCELLED:
        await create_system_message(ride_id, "ride", "تم إلغاء الرحلة")
    
    await db.rides.update_one(
        {"_id": ObjectId(ride_id)},
        {"$set": update_data}
    )
    
    return {"message": f"Ride status updated to {status}", "actual_fare": update_data.get("actual_fare")}

@api_router.get("/rides/my-rides", response_model=List[RideResponse])
async def get_my_rides(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] == "passenger":
        rides = await db.rides.find({"passenger_id": str(current_user["_id"])}).sort("created_at", -1).to_list(50)
    else:
        rides = await db.rides.find({"driver_id": str(current_user["_id"])}).sort("created_at", -1).to_list(50)
    
    result = []
    for ride in rides:
        passenger = await db.users.find_one({"_id": ObjectId(ride["passenger_id"])})
        driver = None
        if ride.get("driver_id"):
            driver = await db.users.find_one({"_id": ObjectId(ride["driver_id"])})
        
        ride_data = serialize_user(ride)
        ride_data["passenger_info"] = UserResponse(**serialize_user(passenger))
        ride_data["driver_info"] = DriverResponse(**serialize_user(driver)) if driver else None
        
        result.append(RideResponse(**ride_data))
    
    return result

# =====================================================
# DELIVERY MANAGEMENT ENDPOINTS
# =====================================================

@api_router.post("/delivery/request", response_model=DeliveryResponse)
async def request_delivery(
    delivery_request: DeliveryRequest,
    current_user: dict = Depends(get_current_user)
):
    # Validation
    if delivery_request.delivery_type == "scheduled":
        if not delivery_request.scheduled_time:
            raise HTTPException(status_code=400, detail="Scheduled time is required for scheduled deliveries")
        if delivery_request.scheduled_time <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    
    # Calculate estimated cost (assume 5km average distance for initial estimate)
    estimated_cost = await calculate_delivery_cost({
        "package_info": delivery_request.package_info.dict()
    }, distance_km=5.0)
    
    # Generate tracking code
    tracking_code = generate_tracking_code()
    
    initial_status = DeliveryStatus.SCHEDULED if delivery_request.delivery_type == "scheduled" else DeliveryStatus.REQUESTED
    
    delivery_doc = {
        "sender_id": str(current_user["_id"]),
        "driver_id": None,
        "pickup_location": delivery_request.pickup_location.dict(),
        "delivery_location": delivery_request.delivery_location.dict(),
        "package_info": delivery_request.package_info.dict(),
        "recipient_info": delivery_request.recipient_info.dict(),
        "status": initial_status,
        "delivery_type": delivery_request.delivery_type,
        "created_at": datetime.utcnow(),
        "scheduled_time": delivery_request.scheduled_time,
        "preferred_delivery_time": delivery_request.preferred_delivery_time,
        "estimated_cost": estimated_cost,
        "actual_cost": None,
        "sender_notes": delivery_request.sender_notes,
        "driver_notes": None,
        "tracking_code": tracking_code,
        "picked_up_at": None,
        "delivered_at": None,
        "distance_km": None,
        "proof_of_delivery": None
    }
    
    result = await db.deliveries.insert_one(delivery_doc)
    delivery_doc["_id"] = result.inserted_id
    
    sender_info = serialize_user(current_user)
    response_data = serialize_user(delivery_doc)
    response_data["sender_info"] = UserResponse(**sender_info)
    response_data["driver_info"] = None
    
    return DeliveryResponse(**response_data)

@api_router.get("/delivery/available", response_model=List[DeliveryResponse])
async def get_available_deliveries(
    package_size: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can view available deliveries")
    
    # Build query based on driver's capabilities
    query = {
        "$or": [
            {"status": DeliveryStatus.REQUESTED},
            {
                "status": DeliveryStatus.SCHEDULED,
                "scheduled_time": {
                    "$lte": datetime.utcnow() + timedelta(minutes=30)
                }
            }
        ]
    }
    
    # Filter by driver's max package size capability
    driver_max_size = current_user.get("driver_info", {}).get("max_package_size", "medium")
    
    # Define size hierarchy: small < medium < large
    size_hierarchy = {"small": 1, "medium": 2, "large": 3}
    max_size_level = size_hierarchy.get(driver_max_size, 2)
    
    allowed_sizes = [size for size, level in size_hierarchy.items() if level <= max_size_level]
    query["package_info.size"] = {"$in": allowed_sizes}
    
    if package_size and package_size in allowed_sizes:
        query["package_info.size"] = package_size
    
    deliveries = await db.deliveries.find(query).to_list(50)
    
    result = []
    for delivery in deliveries:
        sender = await db.users.find_one({"_id": ObjectId(delivery["sender_id"])})
        
        delivery_data = serialize_user(delivery)
        delivery_data["sender_info"] = UserResponse(**serialize_user(sender))
        delivery_data["driver_info"] = None
        
        result.append(DeliveryResponse(**delivery_data))
    
    return result

@api_router.put("/delivery/{delivery_id}/accept")
async def accept_delivery(delivery_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can accept deliveries")
    
    # Check if delivery exists and is available
    delivery = await db.deliveries.find_one({
        "_id": ObjectId(delivery_id), 
        "status": {"$in": [DeliveryStatus.REQUESTED, DeliveryStatus.SCHEDULED]}
    })
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found or not available")
    
    # Check if accepts deliveries
    if not current_user.get("driver_info", {}).get("accepts_deliveries", False):
        raise HTTPException(status_code=403, detail="Driver does not accept deliveries")
    
    # Check package size compatibility
    package_size = delivery["package_info"]["size"]
    driver_max_size = current_user.get("driver_info", {}).get("max_package_size", "medium")
    
    size_hierarchy = {"small": 1, "medium": 2, "large": 3}
    if size_hierarchy.get(package_size, 1) > size_hierarchy.get(driver_max_size, 2):
        raise HTTPException(status_code=403, detail="Package size exceeds driver capability")
    
    # Update delivery with driver info
    await db.deliveries.update_one(
        {"_id": ObjectId(delivery_id)},
        {
            "$set": {
                "driver_id": str(current_user["_id"]),
                "status": DeliveryStatus.ACCEPTED,
                "accepted_at": datetime.utcnow()
            }
        }
    )
    
    # Send system message to chat
    await create_system_message(
        delivery_id, 
        "delivery",
        f"تم قبول طلب التوصيل من قبل السائق {current_user['name']}"
    )
    
    # Notify sender via WebSocket
    sender = await db.users.find_one({"_id": ObjectId(delivery["sender_id"])})
    if sender:
        await manager.send_personal_message({
            "type": "delivery_accepted",
            "delivery_id": delivery_id,
            "driver_name": current_user["name"],
            "driver_info": current_user.get("driver_info", {}),
            "tracking_code": delivery["tracking_code"],
            "message": "تم قبول طلب التوصيل الخاص بك!"
        }, str(sender["_id"]))
    
    return {"message": "Delivery accepted successfully", "tracking_code": delivery["tracking_code"]}

@api_router.put("/delivery/{delivery_id}/pickup")
async def pickup_package(delivery_id: str, current_user: dict = Depends(get_current_user)):
    """Mark package as picked up"""
    delivery = await db.deliveries.find_one({"_id": ObjectId(delivery_id)})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    if str(current_user["_id"]) != delivery.get("driver_id"):
        raise HTTPException(status_code=403, detail="Only the assigned driver can pickup the package")
    
    await db.deliveries.update_one(
        {"_id": ObjectId(delivery_id)},
        {
            "$set": {
                "status": DeliveryStatus.PICKED_UP,
                "picked_up_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await create_system_message(delivery_id, "delivery", "تم استلام الطرد وبدء التوصيل")
    
    return {"message": "Package picked up successfully"}

@api_router.put("/delivery/{delivery_id}/in-transit")
async def mark_in_transit(delivery_id: str, current_user: dict = Depends(get_current_user)):
    """Mark package as in transit"""
    delivery = await db.deliveries.find_one({"_id": ObjectId(delivery_id)})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    if str(current_user["_id"]) != delivery.get("driver_id"):
        raise HTTPException(status_code=403, detail="Only the assigned driver can update delivery status")
    
    await db.deliveries.update_one(
        {"_id": ObjectId(delivery_id)},
        {
            "$set": {
                "status": DeliveryStatus.IN_TRANSIT,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await create_system_message(delivery_id, "delivery", "الطرد في الطريق إلى الوجهة")
    
    return {"message": "Package marked as in transit"}

@api_router.put("/delivery/{delivery_id}/deliver")
async def complete_delivery(
    delivery_id: str, 
    proof_of_delivery: Optional[str] = None,
    distance_km: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """Complete the delivery"""
    delivery = await db.deliveries.find_one({"_id": ObjectId(delivery_id)})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    if str(current_user["_id"]) != delivery.get("driver_id"):
        raise HTTPException(status_code=403, detail="Only the assigned driver can complete delivery")
    
    # Calculate final cost
    actual_cost = await calculate_delivery_cost(delivery, distance_km)
    
    update_data = {
        "status": DeliveryStatus.DELIVERED,
        "delivered_at": datetime.utcnow(),
        "actual_cost": actual_cost,
        "updated_at": datetime.utcnow()
    }
    
    if proof_of_delivery:
        update_data["proof_of_delivery"] = proof_of_delivery
    
    if distance_km:
        update_data["distance_km"] = distance_km
    
    await db.deliveries.update_one(
        {"_id": ObjectId(delivery_id)},
        {"$set": update_data}
    )
    
    await create_system_message(
        delivery_id, 
        "delivery", 
        f"تم تسليم الطرد بنجاح. التكلفة النهائية: {actual_cost} د.ع"
    )
    
    # Update total deliveries count
    await db.users.update_one(
        {"_id": ObjectId(delivery["sender_id"])},
        {"$inc": {"total_deliveries": 1}}
    )
    
    await db.users.update_one(
        {"_id": ObjectId(delivery["driver_id"])},
        {"$inc": {"total_deliveries": 1}}
    )
    
    return {
        "message": "Delivery completed successfully",
        "actual_cost": actual_cost,
        "tracking_code": delivery["tracking_code"]
    }

@api_router.get("/delivery/track/{tracking_code}")
async def track_delivery(tracking_code: str):
    """Track delivery by tracking code (public endpoint)"""
    delivery = await db.deliveries.find_one({"tracking_code": tracking_code})
    if not delivery:
        raise HTTPException(status_code=404, detail="Tracking code not found")
    
    # Get basic info for tracking
    sender = await db.users.find_one({"_id": ObjectId(delivery["sender_id"])})
    driver = None
    if delivery.get("driver_id"):
        driver = await db.users.find_one({"_id": ObjectId(delivery["driver_id"])})
    
    tracking_info = {
        "tracking_code": tracking_code,
        "status": delivery["status"],
        "created_at": delivery["created_at"],
        "pickup_location": delivery["pickup_location"]["address"],
        "delivery_location": delivery["delivery_location"]["address"],
        "package_description": delivery["package_info"]["description"],
        "package_size": delivery["package_info"]["size"],
        "recipient_name": delivery["recipient_info"]["name"],
        "estimated_cost": delivery.get("estimated_cost"),
        "actual_cost": delivery.get("actual_cost"),
        "picked_up_at": delivery.get("picked_up_at"),
        "delivered_at": delivery.get("delivered_at"),
        "driver_name": driver["name"] if driver else None,
        "driver_phone": driver["phone"] if driver else None
    }
    
    return tracking_info

@api_router.get("/delivery/my-deliveries", response_model=List[DeliveryResponse])
async def get_my_deliveries(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] == "passenger":
        deliveries = await db.deliveries.find({"sender_id": str(current_user["_id"])}).sort("created_at", -1).to_list(50)
    else:
        deliveries = await db.deliveries.find({"driver_id": str(current_user["_id"])}).sort("created_at", -1).to_list(50)
    
    result = []
    for delivery in deliveries:
        sender = await db.users.find_one({"_id": ObjectId(delivery["sender_id"])})
        driver = None
        if delivery.get("driver_id"):
            driver = await db.users.find_one({"_id": ObjectId(delivery["driver_id"])})
        
        delivery_data = serialize_user(delivery)
        delivery_data["sender_info"] = UserResponse(**serialize_user(sender))
        delivery_data["driver_info"] = DriverResponse(**serialize_user(driver)) if driver else None
        
        result.append(DeliveryResponse(**delivery_data))
    
    return result

# =====================================================
# UNIFIED CHAT SYSTEM
# =====================================================

async def create_system_message(service_id: str, service_type: str, content: str):
    """Create a system message for a service (ride or delivery)"""
    message_doc = {
        "service_id": service_id,
        "service_type": service_type,
        "sender_id": "system",
        "sender_name": "النظام",
        "sender_type": "system",
        "message_type": MessageType.SYSTEM,
        "content": content,
        "location_data": None,
        "timestamp": datetime.utcnow(),
        "is_read": False
    }
    
    await db.messages.insert_one(message_doc)

@api_router.post("/chat/send", response_model=MessageResponse)
async def send_message(
    message: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify user is part of the service
    if message.service_type == "ride":
        service = await db.rides.find_one({"_id": ObjectId(message.service_id)})
        user_field = "passenger_id"
        other_field = "driver_id"
    else:  # delivery
        service = await db.deliveries.find_one({"_id": ObjectId(message.service_id)})
        user_field = "sender_id"
        other_field = "driver_id"
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    user_id = str(current_user["_id"])
    if user_id not in [service[user_field], service.get(other_field)]:
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this chat")
    
    message_doc = {
        "service_id": message.service_id,
        "service_type": message.service_type,
        "sender_id": user_id,
        "sender_name": current_user["name"],
        "sender_type": current_user["user_type"],
        "message_type": message.message_type,
        "content": message.content,
        "location_data": message.location_data.dict() if message.location_data else None,
        "timestamp": datetime.utcnow(),
        "is_read": False
    }
    
    result = await db.messages.insert_one(message_doc)
    message_doc["_id"] = result.inserted_id
    
    message_response = MessageResponse(**serialize_message(message_doc))
    
    # Send to other participant via WebSocket
    other_user_id = service[user_field] if user_id == service.get(other_field) else service.get(other_field)
    if other_user_id:
        message_for_ws = message_doc.copy()
        message_for_ws["id"] = str(message_doc["_id"])
        await manager.send_personal_message({
            "type": "new_message",
            "message": message_for_ws
        }, other_user_id)
    
    return message_response

@api_router.get("/chat/{service_type}/{service_id}", response_model=ChatResponse)
async def get_chat(service_type: str, service_id: str, current_user: dict = Depends(get_current_user)):
    # Get service and verify authorization
    if service_type == "ride":
        service = await db.rides.find_one({"_id": ObjectId(service_id)})
        user_field = "passenger_id"
        other_field = "driver_id"
    else:  # delivery
        service = await db.deliveries.find_one({"_id": ObjectId(service_id)})
        user_field = "sender_id"
        other_field = "driver_id"
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    user_id = str(current_user["_id"])
    if user_id not in [service[user_field], service.get(other_field)]:
        raise HTTPException(status_code=403, detail="Not authorized to view this chat")
    
    messages = await db.messages.find({
        "service_id": service_id,
        "service_type": service_type
    }).sort("timestamp", 1).to_list(1000)
    
    participants = []
    main_user = await db.users.find_one({"_id": ObjectId(service[user_field])})
    participants.append(UserResponse(**serialize_user(main_user)))
    
    if service.get(other_field):
        other_user = await db.users.find_one({"_id": ObjectId(service[other_field])})
        participants.append(UserResponse(**serialize_user(other_user)))
    
    unread_count = await db.messages.count_documents({
        "service_id": service_id,
        "service_type": service_type,
        "sender_id": {"$ne": user_id},
        "is_read": False
    })
    
    # Mark messages as read
    await db.messages.update_many(
        {
            "service_id": service_id,
            "service_type": service_type,
            "sender_id": {"$ne": user_id}
        },
        {"$set": {"is_read": True}}
    )
    
    return ChatResponse(
        service_id=service_id,
        service_type=service_type,
        participants=participants,
        messages=[MessageResponse(**serialize_message(msg)) for msg in messages],
        unread_count=unread_count
    )

# =====================================================
# UNIFIED RATING SYSTEM
# =====================================================

@api_router.post("/ratings", response_model=RatingResponse)
async def create_rating(
    rating_data: RatingCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get service (ride or delivery)
    if rating_data.service_type == "ride":
        service = await db.rides.find_one({"_id": ObjectId(rating_data.service_id)})
        user_field = "passenger_id"
        other_field = "driver_id"
    else:  # delivery
        service = await db.deliveries.find_one({"_id": ObjectId(rating_data.service_id)})
        user_field = "sender_id"
        other_field = "driver_id"
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if str(current_user["_id"]) not in [service[user_field], service.get(other_field)]:
        raise HTTPException(status_code=403, detail="You can only rate services you participated in")
    
    # Determine who is being rated
    if str(current_user["_id"]) == service[user_field]:
        rated_user_id = service.get(other_field)
    else:
        rated_user_id = service[user_field]
    
    if not rated_user_id:
        raise HTTPException(status_code=400, detail="Cannot rate: service not completed properly")
    
    # Create rating
    rating_doc = {
        "service_id": rating_data.service_id,
        "service_type": rating_data.service_type,
        "rater_id": str(current_user["_id"]),
        "rated_user_id": rated_user_id,
        "rating": rating_data.rating,
        "comment": rating_data.comment,
        "created_at": datetime.utcnow()
    }
    
    result = await db.ratings.insert_one(rating_doc)
    rating_doc["_id"] = result.inserted_id
    
    # Update user's average rating
    ratings = await db.ratings.find({"rated_user_id": rated_user_id}).to_list(1000)
    average_rating = sum(r["rating"] for r in ratings) / len(ratings)
    
    await db.users.update_one(
        {"_id": ObjectId(rated_user_id)},
        {"$set": {"rating": round(average_rating, 1)}}
    )
    
    return RatingResponse(**serialize_user(rating_doc))

# =====================================================
# BASIC ENDPOINTS
# =====================================================

@api_router.get("/")
async def root():
    return {"message": "Orange Bus API - مرحباً بكم في تطبيق الباص البرتقالي للنقل والتوصيل"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@api_router.get("/services")
async def get_available_services():
    """Get all available services"""
    return {
        "services": [
            {
                "type": "ride",
                "name": "خدمة النقل",
                "description": "طلب رحلة من مكان إلى آخر",
                "icon": "car",
                "features": ["تتبع مباشر", "رحلات فورية ومجدولة", "أنواع سيارات مختلفة"]
            },
            {
                "type": "delivery",
                "name": "خدمة التوصيل",
                "description": "توصيل الطرود والمواد",
                "icon": "package",
                "features": ["تتبع الطرد", "أحجام مختلفة", "توقيع عند الاستلام"]
            }
        ]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()