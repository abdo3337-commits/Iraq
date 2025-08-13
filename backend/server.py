from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from enum import Enum
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

app = FastAPI(title="Orange Bus API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Enums
class UserRole(str, Enum):
    PASSENGER = "passenger"
    DRIVER = "driver"
    ADMIN = "admin"

class TripType(str, Enum):
    INSTANT = "instant"
    HOURLY = "hourly"
    TASK = "task"

class TripStatus(str, Enum):
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRIP_PAYMENT = "trip_payment"
    TRIP_EARNING = "trip_earning"

# Districts and Pricing Configuration
DISTRICTS_PRICING = {
    "الرمادي": {
        "instant": {"base": 1500, "per_km": 300, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 250},
        "task": {"base": 2000}
    },
    "هيت": {
        "instant": {"base": 1500, "per_km": 350, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 300},
        "task": {"base": 2000}
    },
    "الفلوجة": {
        "instant": {"base": 1500, "per_km": 325, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 275},
        "task": {"base": 2000}
    },
    "الكرمة": {
        "instant": {"base": 1500, "per_km": 300, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 250},
        "task": {"base": 2000}
    },
    "راوة": {
        "instant": {"base": 1500, "per_km": 350, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 300},
        "task": {"base": 2000}
    },
    "القائم": {
        "instant": {"base": 1500, "per_km": 375, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 325},
        "task": {"base": 2000}
    },
    "حديثة": {
        "instant": {"base": 1500, "per_km": 350, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 300},
        "task": {"base": 2000}
    },
    "الخالدية": {
        "instant": {"base": 1500, "per_km": 300, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 250},
        "task": {"base": 2000}
    },
    "عنة": {
        "instant": {"base": 1500, "per_km": 350, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 300},
        "task": {"base": 2000}
    },
    "الكبيسة": {
        "instant": {"base": 1500, "per_km": 325, "per_minute": 50},
        "hourly": {"base": 10000, "included_km": 15, "extra_km": 275},
        "task": {"base": 2000}
    }
}

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    password_hash: str
    role: UserRole
    wallet_balance: float = 0.0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    role: UserRole

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    wallet_balance: float
    is_active: bool

class Driver(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    vehicle_type: str
    vehicle_model: str
    vehicle_plate: str
    license_number: str
    current_location: Dict[str, float] = {"lat": 0.0, "lng": 0.0}
    is_available: bool = True
    is_verified: bool = False
    rating: float = 5.0
    total_trips: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DriverCreate(BaseModel):
    vehicle_type: str
    vehicle_model: str
    vehicle_plate: str
    license_number: str

class Location(BaseModel):
    lat: float
    lng: float
    address: str

class Trip(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    passenger_id: str
    driver_id: Optional[str] = None
    trip_type: TripType
    pickup_location: Location
    destination: Optional[Location] = None
    district: str
    distance_km: Optional[float] = None
    duration_minutes: Optional[float] = None
    hourly_duration: Optional[int] = None  # for hourly trips
    estimated_price: float
    final_price: Optional[float] = None
    status: TripStatus = TripStatus.REQUESTED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class TripCreate(BaseModel):
    trip_type: TripType
    pickup_location: Location
    destination: Optional[Location] = None
    district: str
    distance_km: Optional[float] = None
    duration_minutes: Optional[float] = None
    hourly_duration: Optional[int] = None

class WalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    transaction_type: TransactionType
    description: str
    balance_after: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WalletDeposit(BaseModel):
    amount: float
    payment_method: str = "cash"  # placeholder for payment integration

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return User(**user_doc)

def calculate_trip_price(district: str, trip_type: str, distance_km: float = 0, duration_minutes: float = 0, hourly_duration: int = 0) -> float:
    pricing = DISTRICTS_PRICING.get(district)
    if not pricing:
        raise HTTPException(status_code=400, detail="District not supported")
    
    type_pricing = pricing.get(trip_type)
    if not type_pricing:
        raise HTTPException(status_code=400, detail="Trip type not supported")
    
    if trip_type == "instant":
        base_price = type_pricing["base"]
        distance_cost = distance_km * type_pricing["per_km"]
        time_cost = duration_minutes * type_pricing["per_minute"]
        return base_price + distance_cost + time_cost
    
    elif trip_type == "hourly":
        base_price = hourly_duration * type_pricing["base"]
        extra_km = max(0, distance_km - (type_pricing["included_km"] * hourly_duration))
        extra_cost = extra_km * type_pricing["extra_km"]
        return base_price + extra_cost
    
    elif trip_type == "task":
        return type_pricing["base"]
    
    return 0.0

# Authentication Routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    password_hash = hash_password(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=password_hash,
        role=user_data.role
    )
    
    await db.users.insert_one(user.dict())
    return UserResponse(**user.dict())

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not verify_password(login_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    user = User(**user_doc)
    access_token = create_access_token({"sub": user.id, "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user.dict())
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

# District and Pricing Routes
@api_router.get("/districts")
async def get_districts():
    return {
        "districts": list(DISTRICTS_PRICING.keys()),
        "pricing": DISTRICTS_PRICING
    }

@api_router.post("/calculate-fare")
async def calculate_fare(trip_data: TripCreate):
    price = calculate_trip_price(
        district=trip_data.district,
        trip_type=trip_data.trip_type,
        distance_km=trip_data.distance_km or 0,
        duration_minutes=trip_data.duration_minutes or 0,
        hourly_duration=trip_data.hourly_duration or 0
    )
    return {"estimated_price": price}

# Trip Routes
@api_router.post("/trips", response_model=Trip)
async def create_trip(trip_data: TripCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.PASSENGER:
        raise HTTPException(status_code=403, detail="Only passengers can create trips")
    
    estimated_price = calculate_trip_price(
        district=trip_data.district,
        trip_type=trip_data.trip_type,
        distance_km=trip_data.distance_km or 0,
        duration_minutes=trip_data.duration_minutes or 0,
        hourly_duration=trip_data.hourly_duration or 0
    )
    
    trip = Trip(
        passenger_id=current_user.id,
        trip_type=trip_data.trip_type,
        pickup_location=trip_data.pickup_location,
        destination=trip_data.destination,
        district=trip_data.district,
        distance_km=trip_data.distance_km,
        duration_minutes=trip_data.duration_minutes,
        hourly_duration=trip_data.hourly_duration,
        estimated_price=estimated_price
    )
    
    await db.trips.insert_one(trip.dict())
    return trip

@api_router.get("/trips", response_model=List[Trip])
async def get_user_trips(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.PASSENGER:
        trips = await db.trips.find({"passenger_id": current_user.id}).to_list(100)
    elif current_user.role == UserRole.DRIVER:
        trips = await db.trips.find({"driver_id": current_user.id}).to_list(100)
    else:  # Admin
        trips = await db.trips.find().to_list(100)
    
    return [Trip(**trip) for trip in trips]

@api_router.get("/trips/available")
async def get_available_trips(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can view available trips")
    
    trips = await db.trips.find({"status": TripStatus.REQUESTED}).to_list(100)
    return [Trip(**trip) for trip in trips]

@api_router.post("/trips/{trip_id}/accept")
async def accept_trip(trip_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can accept trips")
    
    trip = await db.trips.find_one({"id": trip_id, "status": TripStatus.REQUESTED})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or not available")
    
    # Update trip status
    await db.trips.update_one(
        {"id": trip_id},
        {
            "$set": {
                "driver_id": current_user.id,
                "status": TripStatus.ACCEPTED,
                "accepted_at": datetime.utcnow()
            }
        }
    )
    
    updated_trip = await db.trips.find_one({"id": trip_id})
    return Trip(**updated_trip)

@api_router.post("/trips/{trip_id}/start")
async def start_trip(trip_id: str, current_user: User = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id, "driver_id": current_user.id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    await db.trips.update_one(
        {"id": trip_id},
        {
            "$set": {
                "status": TripStatus.IN_PROGRESS,
                "started_at": datetime.utcnow()
            }
        }
    )
    
    updated_trip = await db.trips.find_one({"id": trip_id})
    return Trip(**updated_trip)

@api_router.post("/trips/{trip_id}/complete")
async def complete_trip(trip_id: str, final_price: Optional[float] = None, current_user: User = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id, "driver_id": current_user.id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip_obj = Trip(**trip)
    final_amount = final_price or trip_obj.estimated_price
    
    # Process payment
    passenger = await db.users.find_one({"id": trip_obj.passenger_id})
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")
    
    if passenger["wallet_balance"] < final_amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    
    # Deduct from passenger wallet
    await db.users.update_one(
        {"id": trip_obj.passenger_id},
        {"$inc": {"wallet_balance": -final_amount}}
    )
    
    # Add to driver wallet
    await db.users.update_one(
        {"id": current_user.id},
        {"$inc": {"wallet_balance": final_amount}}
    )
    
    # Record transactions
    passenger_transaction = WalletTransaction(
        user_id=trip_obj.passenger_id,
        amount=-final_amount,
        transaction_type=TransactionType.TRIP_PAYMENT,
        description=f"Payment for trip {trip_id}",
        balance_after=passenger["wallet_balance"] - final_amount
    )
    
    driver_transaction = WalletTransaction(
        user_id=current_user.id,
        amount=final_amount,
        transaction_type=TransactionType.TRIP_EARNING,
        description=f"Earning from trip {trip_id}",
        balance_after=current_user.wallet_balance + final_amount
    )
    
    await db.wallet_transactions.insert_many([passenger_transaction.dict(), driver_transaction.dict()])
    
    # Complete trip
    await db.trips.update_one(
        {"id": trip_id},
        {
            "$set": {
                "status": TripStatus.COMPLETED,
                "final_price": final_amount,
                "completed_at": datetime.utcnow()
            }
        }
    )
    
    updated_trip = await db.trips.find_one({"id": trip_id})
    return Trip(**updated_trip)

# Driver Routes
@api_router.post("/driver/register", response_model=Driver)
async def register_driver(driver_data: DriverCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only users with driver role can register as drivers")
    
    existing_driver = await db.drivers.find_one({"user_id": current_user.id})
    if existing_driver:
        raise HTTPException(status_code=400, detail="Driver profile already exists")
    
    driver = Driver(
        user_id=current_user.id,
        vehicle_type=driver_data.vehicle_type,
        vehicle_model=driver_data.vehicle_model,
        vehicle_plate=driver_data.vehicle_plate,
        license_number=driver_data.license_number
    )
    
    await db.drivers.insert_one(driver.dict())
    return driver

@api_router.get("/driver/profile", response_model=Driver)
async def get_driver_profile(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can access this endpoint")
    
    driver = await db.drivers.find_one({"user_id": current_user.id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    return Driver(**driver)

@api_router.post("/driver/location")
async def update_driver_location(location: Location, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can update location")
    
    await db.drivers.update_one(
        {"user_id": current_user.id},
        {"$set": {"current_location": {"lat": location.lat, "lng": location.lng}}}
    )
    
    return {"message": "Location updated successfully"}

@api_router.post("/driver/availability")
async def toggle_driver_availability(is_available: bool, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can change availability")
    
    await db.drivers.update_one(
        {"user_id": current_user.id},
        {"$set": {"is_available": is_available}}
    )
    
    return {"message": f"Availability set to {is_available}"}

# Wallet Routes
@api_router.post("/wallet/deposit")
async def deposit_to_wallet(deposit_data: WalletDeposit, current_user: User = Depends(get_current_user)):
    # In a real application, you would integrate with a payment gateway here
    # For now, we'll just add the amount to the wallet
    
    new_balance = current_user.wallet_balance + deposit_data.amount
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"wallet_balance": new_balance}}
    )
    
    transaction = WalletTransaction(
        user_id=current_user.id,
        amount=deposit_data.amount,
        transaction_type=TransactionType.DEPOSIT,
        description=f"Wallet deposit via {deposit_data.payment_method}",
        balance_after=new_balance
    )
    
    await db.wallet_transactions.insert_one(transaction.dict())
    
    return {
        "message": "Deposit successful",
        "new_balance": new_balance,
        "transaction_id": transaction.id
    }

@api_router.get("/wallet/balance")
async def get_wallet_balance(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id})
    return {"balance": user["wallet_balance"]}

@api_router.get("/wallet/transactions", response_model=List[WalletTransaction])
async def get_wallet_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.wallet_transactions.find({"user_id": current_user.id}).sort("created_at", -1).to_list(100)
    return [WalletTransaction(**transaction) for transaction in transactions]

# Admin Routes
@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find().to_list(100)
    return [UserResponse(**user) for user in users]

@api_router.get("/admin/drivers", response_model=List[Driver])
async def get_all_drivers(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    drivers = await db.drivers.find().to_list(100)
    return [Driver(**driver) for driver in drivers]

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_drivers = await db.drivers.count_documents({})
    total_trips = await db.trips.count_documents({})
    active_drivers = await db.drivers.count_documents({"is_available": True})
    
    # Trip stats by status
    trip_stats = {}
    for status in TripStatus:
        count = await db.trips.count_documents({"status": status})
        trip_stats[status] = count
    
    return {
        "total_users": total_users,
        "total_drivers": total_drivers,
        "active_drivers": active_drivers,
        "total_trips": total_trips,
        "trip_stats": trip_stats
    }

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Orange Bus API is running"}