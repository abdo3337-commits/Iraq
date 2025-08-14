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
app = FastAPI(title="Orange Bus API", description="Ride-sharing app for Anbar Governorate")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# =====================================================
# MODELS
# =====================================================

class UserType(str):
    PASSENGER = "passenger"
    DRIVER = "driver"

class RideStatus:
    REQUESTED = "requested"
    SCHEDULED = "scheduled"  # New status for pre-booked rides
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RideType:
    IMMEDIATE = "immediate"
    SCHEDULED = "scheduled"  # Pre-booked rides
    OPEN_RIDE = "open_ride"  # Time-based rides

class VehicleType:
    STANDARD = "standard"
    VIP = "vip"

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
    profile_image: Optional[str] = None  # base64 encoded

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    rating: Optional[float] = None
    total_rides: int = 0
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
    car_image: Optional[str] = None  # base64 encoded
    vehicle_type: Literal["standard", "vip"] = "standard"  # New field
    is_available: bool = True
    max_passengers: int = 4
    amenities: List[str] = []  # For VIP cars: ["AC", "WiFi", "Water", "Phone_Charger"]

class DriverResponse(UserResponse):
    driver_info: Optional[DriverInfo] = None

# Location Models
class Location(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

# Enhanced Ride Models
class RideRequest(BaseModel):
    pickup_location: Location
    destination_location: Optional[Location] = None  # Optional for open rides
    passenger_notes: Optional[str] = None
    ride_type: Literal["immediate", "scheduled", "open_ride"] = "immediate"
    vehicle_type: Literal["standard", "vip"] = "standard"
    scheduled_time: Optional[datetime] = None  # For pre-booked rides
    max_duration_minutes: Optional[int] = None  # For open rides (default 480 = 8 hours)

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
    duration_minutes: Optional[int] = None  # Actual duration for completed rides
    distance_km: Optional[float] = None

# Rating Models
class RatingCreate(BaseModel):
    ride_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class RatingResponse(BaseModel):
    id: str
    ride_id: str
    rater_id: str
    rated_user_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

# Chat Models
class MessageCreate(BaseModel):
    ride_id: str
    message_type: Literal["text", "location", "system"] = "text"
    content: str
    location_data: Optional[Location] = None

class MessageResponse(BaseModel):
    id: str
    ride_id: str
    sender_id: str
    sender_name: str
    sender_type: str
    message_type: str
    content: str
    location_data: Optional[Location] = None
    timestamp: datetime
    is_read: bool = False

class ChatResponse(BaseModel):
    ride_id: str
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
    booking_fee: float = 0  # Additional fee for scheduled rides

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

async def get_vehicle_pricing(vehicle_type: str) -> VehiclePricing:
    """Get pricing for different vehicle types"""
    pricing_config = {
        "standard": VehiclePricing(
            vehicle_type="standard",
            base_fare=1000.0,  # 1000 IQD base fare
            rate_per_km=500.0,  # 500 IQD per km
            rate_per_minute=50.0,  # 50 IQD per minute
            minimum_fare=1500.0,  # Minimum 1500 IQD
            booking_fee=500.0  # 500 IQD for scheduled rides
        ),
        "vip": VehiclePricing(
            vehicle_type="vip",
            base_fare=2000.0,  # 2000 IQD base fare
            rate_per_km=800.0,  # 800 IQD per km
            rate_per_minute=80.0,  # 80 IQD per minute
            minimum_fare=3000.0,  # Minimum 3000 IQD
            booking_fee=1000.0  # 1000 IQD for scheduled rides
        )
    }
    return pricing_config.get(vehicle_type, pricing_config["standard"])

async def calculate_ride_fare(ride_data: dict, duration_minutes: int = None, distance_km: float = None) -> float:
    """Calculate fare based on ride type and vehicle type"""
    pricing = await get_vehicle_pricing(ride_data.get("vehicle_type", "standard"))
    
    if ride_data["ride_type"] == "open_ride":
        # For open rides, calculate based on time only
        if duration_minutes:
            return max(pricing.minimum_fare, pricing.base_fare + (duration_minutes * pricing.rate_per_minute))
        return pricing.minimum_fare
    else:
        # For regular rides, calculate based on distance and time
        total_fare = pricing.base_fare
        
        if distance_km:
            total_fare += distance_km * pricing.rate_per_km
        
        if duration_minutes:
            total_fare += duration_minutes * pricing.rate_per_minute
        
        # Add booking fee for scheduled rides
        if ride_data["ride_type"] == "scheduled":
            total_fare += pricing.booking_fee
        
        return max(pricing.minimum_fare, total_fare)

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
            "amenities": []
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

# =====================================================
# ENHANCED RIDE MANAGEMENT ENDPOINTS
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
            ride_request.max_duration_minutes = 480  # Default 8 hours
    
    # Calculate estimated fare
    estimated_fare = await calculate_ride_fare({
        "ride_type": ride_request.ride_type,
        "vehicle_type": ride_request.vehicle_type
    })
    
    # Set initial status based on ride type
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
    
    # Build query based on driver's vehicle type and current time
    query = {
        "$or": [
            {"status": RideStatus.REQUESTED},  # Immediate rides
            {  # Scheduled rides that are ready (within 30 minutes)
                "status": RideStatus.SCHEDULED,
                "scheduled_time": {
                    "$lte": datetime.utcnow() + timedelta(minutes=30)
                }
            }
        ]
    }
    
    # Filter by driver's vehicle type if they specified one
    driver_vehicle_type = current_user.get("driver_info", {}).get("vehicle_type", "standard")
    if vehicle_type:
        query["vehicle_type"] = vehicle_type
    else:
        # Show rides that match driver's vehicle type or lower
        if driver_vehicle_type == "vip":
            query["vehicle_type"] = {"$in": ["standard", "vip"]}
        else:
            query["vehicle_type"] = "standard"
    
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
    
    # Check if driver's vehicle type matches ride requirement
    driver_vehicle_type = current_user.get("driver_info", {}).get("vehicle_type", "standard")
    ride_vehicle_type = ride.get("vehicle_type", "standard")
    
    if ride_vehicle_type == "vip" and driver_vehicle_type != "vip":
        raise HTTPException(status_code=403, detail="VIP ride requires VIP vehicle")
    
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
        f"تم قبول الرحلة من قبل السائق {current_user['name']}"
    )
    
    # Notify passenger via WebSocket
    passenger = await db.users.find_one({"_id": ObjectId(ride["passenger_id"])})
    if passenger:
        await manager.send_personal_message({
            "type": "ride_accepted",
            "ride_id": ride_id,
            "driver_name": current_user["name"],
            "driver_info": current_user.get("driver_info", {}),
            "message": "تم قبول رحلتك!"
        }, str(passenger["_id"]))
    
    return {"message": "Ride accepted successfully"}

@api_router.put("/rides/{ride_id}/start")
async def start_ride(ride_id: str, current_user: dict = Depends(get_current_user)):
    """Start the ride (driver arrived and passenger got in)"""
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    # Check authorization
    if str(current_user["_id"]) != ride.get("driver_id"):
        raise HTTPException(status_code=403, detail="Only the assigned driver can start the ride")
    
    await db.rides.update_one(
        {"_id": ObjectId(ride_id)},
        {
            "$set": {
                "status": RideStatus.IN_PROGRESS,
                "started_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await create_system_message(ride_id, "بدأت الرحلة")
    
    return {"message": "Ride started successfully"}

@api_router.put("/rides/{ride_id}/complete")
async def complete_ride(
    ride_id: str, 
    distance_km: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """Complete the ride and calculate final fare"""
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    # Check authorization (both driver and passenger can complete)
    if str(current_user["_id"]) not in [ride.get("driver_id"), ride["passenger_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized to complete this ride")
    
    # Calculate actual duration and fare
    started_at = ride.get("started_at")
    if not started_at:
        raise HTTPException(status_code=400, detail="Ride was not started properly")
    
    ended_at = datetime.utcnow()
    duration_minutes = int((ended_at - started_at).total_seconds() / 60)
    
    # Calculate final fare
    actual_fare = await calculate_ride_fare(ride, duration_minutes, distance_km)
    
    update_data = {
        "status": RideStatus.COMPLETED,
        "ended_at": ended_at,
        "duration_minutes": duration_minutes,
        "actual_fare": actual_fare,
        "updated_at": datetime.utcnow()
    }
    
    if distance_km:
        update_data["distance_km"] = distance_km
    
    await db.rides.update_one(
        {"_id": ObjectId(ride_id)},
        {"$set": update_data}
    )
    
    await create_system_message(ride_id, f"تم إنهاء الرحلة بنجاح. المدة: {duration_minutes} دقيقة، التكلفة: {actual_fare} د.ع")
    
    # Update total rides count for both users
    await db.users.update_one(
        {"_id": ObjectId(ride["passenger_id"])},
        {"$inc": {"total_rides": 1}}
    )
    
    if ride.get("driver_id"):
        await db.users.update_one(
            {"_id": ObjectId(ride["driver_id"])},
            {"$inc": {"total_rides": 1}}
        )
    
    return {
        "message": "Ride completed successfully",
        "duration_minutes": duration_minutes,
        "actual_fare": actual_fare
    }

@api_router.put("/rides/{ride_id}/status")
async def update_ride_status(
    ride_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    # Check authorization
    if (current_user["user_type"] == "passenger" and str(current_user["_id"]) != ride["passenger_id"]) or \
       (current_user["user_type"] == "driver" and str(current_user["_id"]) != ride.get("driver_id")):
        raise HTTPException(status_code=403, detail="Not authorized to update this ride")
    
    await db.rides.update_one(
        {"_id": ObjectId(ride_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    # Send system message
    status_messages = {
        RideStatus.CANCELLED: "تم إلغاء الرحلة"
    }
    
    if status in status_messages:
        await create_system_message(ride_id, status_messages[status])
    
    # Notify other party via WebSocket
    other_user_id = ride["passenger_id"] if current_user["user_type"] == "driver" else ride.get("driver_id")
    if other_user_id:
        await manager.send_personal_message({
            "type": "ride_status_updated",
            "ride_id": ride_id,
            "status": status,
            "message": status_messages.get(status, f"تم تحديث حالة الرحلة إلى {status}")
        }, other_user_id)
    
    return {"message": "Ride status updated successfully"}

@api_router.get("/rides/my-rides", response_model=List[RideResponse])
async def get_my_rides(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] == "passenger":
        rides = await db.rides.find({"passenger_id": str(current_user["_id"])}).sort("created_at", -1).to_list(50)
    else:
        rides = await db.rides.find({"driver_id": str(current_user["_id"])}).sort("created_at", -1).to_list(50)
    
    result = []
    for ride in rides:
        # Get passenger and driver info
        passenger = await db.users.find_one({"_id": ObjectId(ride["passenger_id"])})
        driver = None
        if ride.get("driver_id"):
            driver = await db.users.find_one({"_id": ObjectId(ride["driver_id"])})
        
        ride_data = serialize_user(ride)
        ride_data["passenger_info"] = UserResponse(**serialize_user(passenger))
        ride_data["driver_info"] = DriverResponse(**serialize_user(driver)) if driver else None
        
        result.append(RideResponse(**ride_data))
    
    return result

@api_router.get("/rides/scheduled")
async def get_scheduled_rides(current_user: dict = Depends(get_current_user)):
    """Get upcoming scheduled rides"""
    if current_user["user_type"] == "passenger":
        query = {"passenger_id": str(current_user["_id"])}
    else:
        query = {"driver_id": str(current_user["_id"])}
    
    query.update({
        "status": {"$in": [RideStatus.SCHEDULED, RideStatus.ACCEPTED]},
        "scheduled_time": {"$gte": datetime.utcnow()}
    })
    
    rides = await db.rides.find(query).sort("scheduled_time", 1).to_list(20)
    
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
# CHAT SYSTEM ENDPOINTS
# =====================================================

async def create_system_message(ride_id: str, content: str):
    """Create a system message for a ride"""
    message_doc = {
        "ride_id": ride_id,
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
    # Verify user is part of the ride
    ride = await db.rides.find_one({"_id": ObjectId(message.ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    user_id = str(current_user["_id"])
    if user_id not in [ride["passenger_id"], ride.get("driver_id")]:
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this chat")
    
    message_doc = {
        "ride_id": message.ride_id,
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
    other_user_id = ride["passenger_id"] if user_id == ride.get("driver_id") else ride.get("driver_id")
    if other_user_id:
        await manager.send_personal_message({
            "type": "new_message",
            "message": serialize_message(message_doc)
        }, other_user_id)
    
    return message_response

@api_router.get("/chat/{ride_id}", response_model=ChatResponse)
async def get_chat(ride_id: str, current_user: dict = Depends(get_current_user)):
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    user_id = str(current_user["_id"])
    if user_id not in [ride["passenger_id"], ride.get("driver_id")]:
        raise HTTPException(status_code=403, detail="Not authorized to view this chat")
    
    messages = await db.messages.find({"ride_id": ride_id}).sort("timestamp", 1).to_list(1000)
    
    participants = []
    passenger = await db.users.find_one({"_id": ObjectId(ride["passenger_id"])})
    participants.append(UserResponse(**serialize_user(passenger)))
    
    if ride.get("driver_id"):
        driver = await db.users.find_one({"_id": ObjectId(ride["driver_id"])})
        participants.append(UserResponse(**serialize_user(driver)))
    
    unread_count = await db.messages.count_documents({
        "ride_id": ride_id,
        "sender_id": {"$ne": user_id},
        "is_read": False
    })
    
    # Mark messages as read
    await db.messages.update_many(
        {"ride_id": ride_id, "sender_id": {"$ne": user_id}},
        {"$set": {"is_read": True}}
    )
    
    return ChatResponse(
        ride_id=ride_id,
        participants=participants,
        messages=[MessageResponse(**serialize_message(msg)) for msg in messages],
        unread_count=unread_count
    )

# =====================================================
# RATING SYSTEM ENDPOINTS
# =====================================================

@api_router.post("/ratings", response_model=RatingResponse)
async def create_rating(
    rating_data: RatingCreate,
    current_user: dict = Depends(get_current_user)
):
    ride = await db.rides.find_one({"_id": ObjectId(rating_data.ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if str(current_user["_id"]) not in [ride["passenger_id"], ride.get("driver_id")]:
        raise HTTPException(status_code=403, detail="You can only rate rides you participated in")
    
    # Determine who is being rated
    if str(current_user["_id"]) == ride["passenger_id"]:
        rated_user_id = ride.get("driver_id")
    else:
        rated_user_id = ride["passenger_id"]
    
    if not rated_user_id:
        raise HTTPException(status_code=400, detail="Cannot rate: ride not completed properly")
    
    # Create rating
    rating_doc = {
        "ride_id": rating_data.ride_id,
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
# BACKGROUND TASKS FOR SCHEDULED RIDES
# =====================================================

async def check_scheduled_rides():
    """Background task to process scheduled rides"""
    while True:
        try:
            # Find scheduled rides that should be activated now
            current_time = datetime.utcnow()
            ready_rides = await db.rides.find({
                "status": RideStatus.SCHEDULED,
                "scheduled_time": {"$lte": current_time + timedelta(minutes=15)},  # 15 minutes before
                "driver_id": None  # Not yet accepted
            }).to_list(100)
            
            for ride in ready_rides:
                # Update status to make it available for drivers
                await db.rides.update_one(
                    {"_id": ride["_id"]},
                    {"$set": {"status": RideStatus.REQUESTED}}
                )
                
                # Notify passenger that ride is now being matched
                await manager.send_personal_message({
                    "type": "ride_ready",
                    "ride_id": str(ride["_id"]),
                    "message": "رحلتك المجدولة جاهزة الآن، نبحث عن سائق..."
                }, ride["passenger_id"])
        
        except Exception as e:
            print(f"Error in scheduled rides checker: {e}")
        
        # Check every minute
        await asyncio.sleep(60)

# Start background task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_scheduled_rides())

# =====================================================
# BASIC ENDPOINTS
# =====================================================

@api_router.get("/")
async def root():
    return {"message": "Orange Bus API - مرحباً بكم في تطبيق الباص البرتقالي"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

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