#!/usr/bin/env python3
"""
Abu Al-Gharbiya (أبو الغربية) Backend API Testing Suite
Comprehensive testing for ride-sharing and delivery app backend for Anbar Governorate, Iraq
"""

import requests
import json
import time
import random
import websocket
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://smart-taxi-2.preview.emergentagent.com/api"
WS_URL = "wss://smart-taxi-2.preview.emergentagent.com/ws"
TIMEOUT = 30

class AbuAlGharbiyaAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.ws_url = WS_URL
        self.passenger_token = None
        self.driver_token = None
        self.passenger_id = None
        self.driver_id = None
        self.test_ride_id = None
        self.test_delivery_id = None
        self.tracking_code = None
        self.test_suffix = str(random.randint(1000, 9999))
        self.passenger_phone = f"07701234{self.test_suffix}"
        self.driver_phone = f"07712345{self.test_suffix}"
        self.ws_messages = []
        self.ws_connected = False
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, params: Dict = None) -> tuple:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=TIMEOUT)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, params=params, timeout=TIMEOUT)
            else:
                return False, f"Unsupported method: {method}"
            
            return True, response
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}"
    
    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n=== Testing Health Endpoints ===")
        
        # Test root endpoint
        success, response = self.make_request("GET", "/")
        if success and response.status_code == 200:
            data = response.json()
            if "أبو الغربية" in data.get("message", "") or "Orange Bus" in data.get("message", ""):
                self.log_result("Root endpoint", True, "Arabic welcome message received")
            else:
                self.log_result("Root endpoint", False, f"Unexpected message: {data}")
        else:
            error_msg = response if not success else f"Status: {response.status_code}"
            self.log_result("Root endpoint", False, str(error_msg))
        
        # Test health endpoint
        success, response = self.make_request("GET", "/health")
        if success and response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                self.log_result("Health check", True, "Backend is healthy")
            else:
                self.log_result("Health check", False, f"Unhealthy status: {data}")
        else:
            error_msg = response if not success else f"Status: {response.status_code}"
            self.log_result("Health check", False, str(error_msg))
        
        # Test services endpoint
        success, response = self.make_request("GET", "/services")
        if success and response.status_code == 200:
            data = response.json()
            services = data.get("services", [])
            if len(services) >= 2:  # Should have ride and delivery services
                self.log_result("Services endpoint", True, f"Found {len(services)} services")
            else:
                self.log_result("Services endpoint", False, f"Expected 2+ services, got: {services}")
        else:
            error_msg = response if not success else f"Status: {response.status_code}"
            self.log_result("Services endpoint", False, str(error_msg))
    
    def test_vehicle_types_and_pricing(self):
        """Test vehicle types and pricing endpoints"""
        print("\n=== Testing Vehicle Types & Pricing ===")
        
        success, response = self.make_request("GET", "/vehicle-types")
        if success and response.status_code == 200:
            data = response.json()
            vehicle_types = data.get("vehicle_types", [])
            
            # Check for standard and VIP types
            standard_found = any(v["type"] == "standard" for v in vehicle_types)
            vip_found = any(v["type"] == "vip" for v in vehicle_types)
            
            if standard_found and vip_found:
                self.log_result("Vehicle types endpoint", True, "Standard and VIP vehicle types available")
                
                # Check pricing structure
                for vehicle in vehicle_types:
                    if all(key in vehicle for key in ["base_fare", "rate_per_km", "rate_per_minute"]):
                        self.log_result(f"{vehicle['type']} pricing", True, f"Base fare: {vehicle['base_fare']} IQD")
                    else:
                        self.log_result(f"{vehicle['type']} pricing", False, "Missing pricing information")
            else:
                self.log_result("Vehicle types endpoint", False, f"Missing vehicle types: {vehicle_types}")
        else:
            error_msg = response if not success else f"Status: {response.status_code}"
            self.log_result("Vehicle types endpoint", False, str(error_msg))
    
    def test_package_sizes_and_pricing(self):
        """Test package sizes and delivery pricing"""
        print("\n=== Testing Package Sizes & Delivery Pricing ===")
        
        success, response = self.make_request("GET", "/delivery/package-sizes")
        if success and response.status_code == 200:
            data = response.json()
            package_sizes = data.get("package_sizes", [])
            
            # Check for small, medium, large sizes
            expected_sizes = ["small", "medium", "large"]
            found_sizes = [p["size"] for p in package_sizes]
            
            if all(size in found_sizes for size in expected_sizes):
                self.log_result("Package sizes endpoint", True, f"All package sizes available: {found_sizes}")
                
                # Check pricing structure
                for package in package_sizes:
                    if all(key in package for key in ["base_cost", "rate_per_km", "max_weight"]):
                        self.log_result(f"{package['size']} package pricing", True, 
                                      f"Base cost: {package['base_cost']} IQD, Max weight: {package['max_weight']}kg")
                    else:
                        self.log_result(f"{package['size']} package pricing", False, "Missing pricing information")
            else:
                self.log_result("Package sizes endpoint", False, f"Missing package sizes. Expected: {expected_sizes}, Got: {found_sizes}")
        else:
            error_msg = response if not success else f"Status: {response.status_code}"
            self.log_result("Package sizes endpoint", False, str(error_msg))
    
    def test_user_registration_and_authentication(self):
        """Test comprehensive user registration with Iraqi data"""
        print("\n=== Testing User Registration & Authentication ===")
        
        # Test passenger registration with Arabic name
        passenger_data = {
            "name": "أحمد محمد الأنباري",
            "phone": self.passenger_phone,
            "email": f"ahmed.anbar{self.test_suffix}@gmail.com",
            "user_type": "passenger",
            "password": "SecurePass123!"
        }
        
        success, response = self.make_request("POST", "/auth/register", passenger_data)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("access_token") and data.get("user"):
                self.passenger_token = data["access_token"]
                self.passenger_id = data["user"]["id"]
                self.log_result("Passenger registration", True, f"Arabic name supported, User ID: {self.passenger_id}")
            else:
                self.log_result("Passenger registration", False, "Missing token or user data")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Passenger registration", False, error_msg)
        
        # Test driver registration with delivery capabilities
        driver_data = {
            "name": "سعد علي الرمادي",
            "phone": self.driver_phone,
            "email": f"saad.ramadi{self.test_suffix}@gmail.com",
            "user_type": "driver",
            "password": "DriverPass456!"
        }
        
        success, response = self.make_request("POST", "/auth/register", driver_data)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("access_token") and data.get("user"):
                self.driver_token = data["access_token"]
                self.driver_id = data["user"]["id"]
                self.log_result("Driver registration", True, f"Driver registered with ID: {self.driver_id}")
            else:
                self.log_result("Driver registration", False, "Missing token or user data")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Driver registration", False, error_msg)
        
        # Test login
        login_data = {
            "phone": self.passenger_phone,
            "password": "SecurePass123!"
        }
        
        success, response = self.make_request("POST", "/auth/login", login_data)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("access_token"):
                self.log_result("User login", True, "Login successful")
            else:
                self.log_result("User login", False, "Missing access token")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("User login", False, error_msg)
    
    def test_driver_capabilities_setup(self):
        """Test driver info update with delivery capabilities"""
        print("\n=== Testing Driver Capabilities Setup ===")
        
        if not self.driver_token:
            self.log_result("Driver capabilities setup", False, "No driver token available")
            return
        
        # Update driver info with VIP vehicle and delivery capabilities
        driver_info = {
            "license_number": "AN123456789",
            "car_model": "Toyota Camry 2022",
            "car_color": "أسود",
            "car_plate": "أنبار 54321",
            "vehicle_type": "vip",
            "is_available": True,
            "max_passengers": 4,
            "amenities": ["واي فاي", "مياه مجانية", "شاحن هاتف"],
            "accepts_deliveries": True,
            "max_package_size": "large",
            "delivery_equipment": ["حقيبة عازلة", "معدات أمان"]
        }
        
        success, response = self.make_request("PUT", "/drivers/info", driver_info, self.driver_token)
        if success and response.status_code == 200:
            data = response.json()
            driver_info_response = data.get("driver_info", {})
            
            # Check VIP vehicle type
            if driver_info_response.get("vehicle_type") == "vip":
                self.log_result("VIP vehicle setup", True, "Driver configured as VIP vehicle")
            else:
                self.log_result("VIP vehicle setup", False, f"Expected VIP, got: {driver_info_response.get('vehicle_type')}")
            
            # Check delivery capabilities
            if driver_info_response.get("accepts_deliveries") == True:
                self.log_result("Delivery acceptance setup", True, "Driver accepts deliveries")
            else:
                self.log_result("Delivery acceptance setup", False, "Driver delivery acceptance not set")
            
            # Check package size capability
            if driver_info_response.get("max_package_size") == "large":
                self.log_result("Package size capability", True, "Driver can handle large packages")
            else:
                self.log_result("Package size capability", False, f"Expected large, got: {driver_info_response.get('max_package_size')}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Driver capabilities setup", False, error_msg)
    
    def test_advanced_ride_features(self):
        """Test advanced ride features: immediate, scheduled, open rides with different vehicle types"""
        print("\n=== Testing Advanced Ride Features ===")
        
        if not self.passenger_token:
            self.log_result("Advanced ride features", False, "No passenger token available")
            return
        
        # Test 1: Immediate VIP ride
        immediate_vip_ride = {
            "pickup_location": {
                "latitude": 33.4242,
                "longitude": 43.2581,
                "address": "جامعة الأنبار، الرمادي"
            },
            "destination_location": {
                "latitude": 33.4156,
                "longitude": 43.3075,
                "address": "مركز مدينة الرمادي"
            },
            "ride_type": "immediate",
            "vehicle_type": "vip",
            "passenger_notes": "أحتاج سيارة VIP للاجتماع المهم"
        }
        
        success, response = self.make_request("POST", "/rides/request", immediate_vip_ride, self.passenger_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("vehicle_type") == "vip" and data.get("ride_type") == "immediate":
                self.test_ride_id = data["id"]
                self.log_result("Immediate VIP ride request", True, f"VIP ride requested, estimated fare: {data.get('estimated_fare')} IQD")
            else:
                self.log_result("Immediate VIP ride request", False, f"Wrong ride type or vehicle: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Immediate VIP ride request", False, error_msg)
        
        # Test 2: Scheduled Standard ride (pre-booking)
        scheduled_time = datetime.utcnow() + timedelta(hours=2)
        scheduled_ride = {
            "pickup_location": {
                "latitude": 33.3806,
                "longitude": 43.3000,
                "address": "الفلوجة، مركز المدينة"
            },
            "destination_location": {
                "latitude": 33.4242,
                "longitude": 43.2581,
                "address": "جامعة الأنبار، الرمادي"
            },
            "ride_type": "scheduled",
            "vehicle_type": "standard",
            "scheduled_time": scheduled_time.isoformat(),
            "passenger_notes": "رحلة مجدولة للجامعة"
        }
        
        success, response = self.make_request("POST", "/rides/request", scheduled_ride, self.passenger_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("ride_type") == "scheduled" and data.get("status") == "scheduled":
                self.log_result("Scheduled ride (pre-booking)", True, f"Scheduled ride created for {scheduled_time.strftime('%H:%M')}")
            else:
                self.log_result("Scheduled ride (pre-booking)", False, f"Wrong status or type: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Scheduled ride (pre-booking)", False, error_msg)
        
        # Test 3: Open ride (no specific destination)
        open_ride = {
            "pickup_location": {
                "latitude": 33.4156,
                "longitude": 43.3075,
                "address": "مركز مدينة الرمادي"
            },
            "ride_type": "open_ride",
            "vehicle_type": "standard",
            "max_duration_minutes": 120,
            "passenger_notes": "رحلة مفتوحة لمدة ساعتين في المدينة"
        }
        
        success, response = self.make_request("POST", "/rides/request", open_ride, self.passenger_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("ride_type") == "open_ride" and not data.get("destination_location"):
                self.log_result("Open ride request", True, f"Open ride created for {data.get('max_duration_minutes', 0)} minutes")
            else:
                self.log_result("Open ride request", False, f"Wrong ride configuration: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Open ride request", False, error_msg)
    
    def test_delivery_service_system(self):
        """Test comprehensive delivery service workflow"""
        print("\n=== Testing Delivery Service System ===")
        
        if not self.passenger_token:
            self.log_result("Delivery service system", False, "No passenger token available")
            return
        
        # Test delivery request with different package sizes
        delivery_requests = [
            {
                "size": "small",
                "description": "وثائق مهمة ومستندات",
                "weight_kg": 2.0,
                "fragile": False,
                "requires_signature": True
            },
            {
                "size": "medium", 
                "description": "ملابس وأحذية",
                "weight_kg": 8.5,
                "fragile": False,
                "requires_signature": False
            },
            {
                "size": "large",
                "description": "جهاز كمبيوتر محمول",
                "weight_kg": 15.0,
                "fragile": True,
                "requires_signature": True,
                "declared_value": 500000.0  # 500,000 IQD
            }
        ]
        
        for i, package_info in enumerate(delivery_requests):
            delivery_data = {
                "pickup_location": {
                    "latitude": 33.4242,
                    "longitude": 43.2581,
                    "address": "جامعة الأنبار، الرمادي"
                },
                "delivery_location": {
                    "latitude": 33.3806,
                    "longitude": 43.3000,
                    "address": "الفلوجة، شارع الجامعة"
                },
                "package_info": package_info,
                "recipient_info": {
                    "name": "محمد أحمد الفلوجي",
                    "phone": "07701234567",
                    "notes": "يرجى الاتصال عند الوصول"
                },
                "sender_notes": f"طرد {package_info['size']} - يرجى التعامل بحذر",
                "delivery_type": "immediate"
            }
            
            success, response = self.make_request("POST", "/delivery/request", delivery_data, self.passenger_token)
            if success and response.status_code == 200:
                data = response.json()
                if data.get("tracking_code") and data.get("estimated_cost"):
                    if i == 0:  # Store first delivery for further testing
                        self.test_delivery_id = data["id"]
                        self.tracking_code = data["tracking_code"]
                    
                    self.log_result(f"{package_info['size']} package delivery request", True, 
                                  f"Tracking: {data['tracking_code']}, Cost: {data['estimated_cost']} IQD")
                else:
                    self.log_result(f"{package_info['size']} package delivery request", False, f"Missing tracking or cost: {data}")
            else:
                error_msg = response.text if success else str(response)
                self.log_result(f"{package_info['size']} package delivery request", False, error_msg)
    
    def test_package_tracking(self):
        """Test package tracking functionality"""
        print("\n=== Testing Package Tracking ===")
        
        if not self.tracking_code:
            self.log_result("Package tracking", False, "No tracking code available")
            return
        
        # Test public tracking endpoint (no authentication required)
        success, response = self.make_request("GET", f"/delivery/track/{self.tracking_code}")
        if success and response.status_code == 200:
            data = response.json()
            required_fields = ["tracking_code", "status", "pickup_location", "delivery_location", "package_description"]
            
            if all(field in data for field in required_fields):
                self.log_result("Package tracking", True, f"Status: {data['status']}, Package: {data['package_description']}")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_result("Package tracking", False, f"Missing fields: {missing_fields}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Package tracking", False, error_msg)
    
    def test_driver_delivery_workflow(self):
        """Test driver delivery acceptance and workflow"""
        print("\n=== Testing Driver Delivery Workflow ===")
        
        if not self.driver_token:
            self.log_result("Driver delivery workflow", False, "No driver token available")
            return
        
        # Test viewing available deliveries
        success, response = self.make_request("GET", "/delivery/available", token=self.driver_token)
        if success and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("View available deliveries", True, f"Found {len(data)} available deliveries")
                
                # Test accepting a delivery if available
                if data and self.test_delivery_id:
                    success, response = self.make_request("PUT", f"/delivery/{self.test_delivery_id}/accept", token=self.driver_token)
                    if success and response.status_code == 200:
                        accept_data = response.json()
                        if "accepted" in accept_data.get("message", "").lower():
                            self.log_result("Delivery acceptance", True, f"Delivery accepted: {accept_data.get('tracking_code')}")
                            
                            # Test delivery status updates
                            self.test_delivery_status_updates()
                        else:
                            self.log_result("Delivery acceptance", False, f"Unexpected response: {accept_data}")
                    else:
                        error_msg = response.text if success else str(response)
                        self.log_result("Delivery acceptance", False, error_msg)
            else:
                self.log_result("View available deliveries", False, f"Invalid response format: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("View available deliveries", False, error_msg)
    
    def test_delivery_status_updates(self):
        """Test delivery status update workflow"""
        print("\n=== Testing Delivery Status Updates ===")
        
        if not self.driver_token or not self.test_delivery_id:
            self.log_result("Delivery status updates", False, "No driver token or delivery ID available")
            return
        
        # Test pickup
        success, response = self.make_request("PUT", f"/delivery/{self.test_delivery_id}/pickup", token=self.driver_token)
        if success and response.status_code == 200:
            self.log_result("Package pickup", True, "Package marked as picked up")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Package pickup", False, error_msg)
        
        # Test in-transit
        success, response = self.make_request("PUT", f"/delivery/{self.test_delivery_id}/in-transit", token=self.driver_token)
        if success and response.status_code == 200:
            self.log_result("Package in-transit", True, "Package marked as in transit")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Package in-transit", False, error_msg)
        
        # Test delivery completion
        completion_data = {
            "distance_km": 15.5,
            "proof_of_delivery": "base64_encoded_signature_image"
        }
        success, response = self.make_request("PUT", f"/delivery/{self.test_delivery_id}/deliver", 
                                            completion_data, self.driver_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("actual_cost"):
                self.log_result("Delivery completion", True, f"Delivery completed, final cost: {data['actual_cost']} IQD")
            else:
                self.log_result("Delivery completion", False, f"Missing final cost: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Delivery completion", False, error_msg)
    
    def test_websocket_communication(self):
        """Test WebSocket real-time communication"""
        print("\n=== Testing WebSocket Real-time Communication ===")
        
        if not self.passenger_id:
            self.log_result("WebSocket communication", False, "No passenger ID available")
            return
        
        def on_message(ws, message):
            self.ws_messages.append(json.loads(message))
            print(f"   WebSocket message received: {message}")
        
        def on_error(ws, error):
            print(f"   WebSocket error: {error}")
        
        def on_close(ws, close_status_code, close_msg):
            self.ws_connected = False
            print("   WebSocket connection closed")
        
        def on_open(ws):
            self.ws_connected = True
            print("   WebSocket connection opened")
        
        try:
            # Test WebSocket connection
            ws_url = f"{self.ws_url}/{self.passenger_id}"
            ws = websocket.WebSocketApp(ws_url,
                                      on_open=on_open,
                                      on_message=on_message,
                                      on_error=on_error,
                                      on_close=on_close)
            
            # Run WebSocket in a separate thread
            wst = threading.Thread(target=ws.run_forever)
            wst.daemon = True
            wst.start()
            
            # Wait for connection
            time.sleep(2)
            
            if self.ws_connected:
                self.log_result("WebSocket connection", True, "Successfully connected to WebSocket")
                
                # Test sending a message (if we have a service to send to)
                if self.test_ride_id or self.test_delivery_id:
                    time.sleep(1)  # Wait for any messages
                    self.log_result("WebSocket message handling", True, f"Received {len(self.ws_messages)} messages")
                else:
                    self.log_result("WebSocket message handling", True, "Connection established, no services to test messaging")
            else:
                self.log_result("WebSocket connection", False, "Failed to establish WebSocket connection")
            
            ws.close()
            
        except Exception as e:
            self.log_result("WebSocket communication", False, f"WebSocket test failed: {str(e)}")
    
    def test_unified_chat_system(self):
        """Test unified chat system for rides and deliveries"""
        print("\n=== Testing Unified Chat System ===")
        
        if not self.passenger_token or not (self.test_ride_id or self.test_delivery_id):
            self.log_result("Unified chat system", False, "No tokens or service IDs available")
            return
        
        # Test chat for ride if available
        if self.test_ride_id:
            # Send a message
            message_data = {
                "service_id": self.test_ride_id,
                "service_type": "ride",
                "message_type": "text",
                "content": "مرحبا، أنا في انتظارك عند البوابة الرئيسية"
            }
            
            success, response = self.make_request("POST", "/chat/send", message_data, self.passenger_token)
            if success and response.status_code == 200:
                data = response.json()
                if data.get("content") == message_data["content"]:
                    self.log_result("Ride chat message sending", True, "Message sent successfully")
                else:
                    self.log_result("Ride chat message sending", False, f"Message content mismatch: {data}")
            else:
                error_msg = response.text if success else str(response)
                self.log_result("Ride chat message sending", False, error_msg)
            
            # Get chat history
            success, response = self.make_request("GET", f"/chat/ride/{self.test_ride_id}", token=self.passenger_token)
            if success and response.status_code == 200:
                data = response.json()
                if data.get("messages") and isinstance(data["messages"], list):
                    self.log_result("Ride chat history", True, f"Retrieved {len(data['messages'])} messages")
                else:
                    self.log_result("Ride chat history", False, f"Invalid chat data: {data}")
            else:
                error_msg = response.text if success else str(response)
                self.log_result("Ride chat history", False, error_msg)
        
        # Test chat for delivery if available
        if self.test_delivery_id:
            message_data = {
                "service_id": self.test_delivery_id,
                "service_type": "delivery",
                "message_type": "text",
                "content": "الطرد جاهز للاستلام من العنوان المحدد"
            }
            
            success, response = self.make_request("POST", "/chat/send", message_data, self.passenger_token)
            if success and response.status_code == 200:
                self.log_result("Delivery chat message sending", True, "Delivery chat message sent")
            else:
                error_msg = response.text if success else str(response)
                self.log_result("Delivery chat message sending", False, error_msg)
    
    def test_unified_rating_system(self):
        """Test unified rating system for both rides and deliveries"""
        print("\n=== Testing Unified Rating System ===")
        
        if not self.passenger_token:
            self.log_result("Unified rating system", False, "No passenger token available")
            return
        
        # Test ride rating if ride is available - complete the ride first
        if self.test_ride_id and self.driver_token:
            # Accept and complete the ride first
            success, response = self.make_request("PUT", f"/rides/{self.test_ride_id}/accept", token=self.driver_token)
            if success and response.status_code == 200:
                # Start the ride
                success, response = self.make_request("PUT", f"/rides/{self.test_ride_id}/status", 
                                                    params={"status": "in_progress"}, token=self.driver_token)
                if success and response.status_code == 200:
                    # Complete the ride
                    success, response = self.make_request("PUT", f"/rides/{self.test_ride_id}/status", 
                                                        params={"status": "completed", "distance_km": 10.5}, token=self.driver_token)
                    if success and response.status_code == 200:
                        # Now rate the ride
                        ride_rating = {
                            "service_id": self.test_ride_id,
                            "service_type": "ride",
                            "rating": 5,
                            "comment": "سائق ممتاز ومهذب، وصل في الوقت المحدد والسيارة نظيفة"
                        }
                        
                        success, response = self.make_request("POST", "/ratings", ride_rating, self.passenger_token)
                        if success and response.status_code == 200:
                            data = response.json()
                            if data.get("rating") == 5 and data.get("service_type") == "ride":
                                self.log_result("Ride rating", True, "Ride rated successfully with Arabic comment")
                            else:
                                self.log_result("Ride rating", False, f"Invalid rating data: {data}")
                        else:
                            error_msg = response.text if success else str(response)
                            self.log_result("Ride rating", False, error_msg)
                    else:
                        self.log_result("Ride rating", False, "Could not complete ride for rating")
                else:
                    self.log_result("Ride rating", False, "Could not start ride for rating")
            else:
                self.log_result("Ride rating", False, "Could not accept ride for rating")
        
        # Test delivery rating if delivery is available
        if self.test_delivery_id:
            delivery_rating = {
                "service_id": self.test_delivery_id,
                "service_type": "delivery",
                "rating": 4,
                "comment": "توصيل سريع وآمن، السائق تعامل بحذر مع الطرد"
            }
            
            success, response = self.make_request("POST", "/ratings", delivery_rating, self.passenger_token)
            if success and response.status_code == 200:
                data = response.json()
                if data.get("rating") == 4 and data.get("service_type") == "delivery":
                    self.log_result("Delivery rating", True, "Delivery rated successfully with Arabic comment")
                else:
                    self.log_result("Delivery rating", False, f"Invalid rating data: {data}")
            else:
                error_msg = response.text if success else str(response)
                self.log_result("Delivery rating", False, error_msg)
    
    def test_arabic_language_support(self):
        """Test Arabic language support throughout the system"""
        print("\n=== Testing Arabic Language Support ===")
        
        # Test Arabic in user names (already tested in registration)
        # Test Arabic in addresses and locations (already tested in ride/delivery requests)
        # Test Arabic in comments and messages (already tested in chat and ratings)
        
        # Test Arabic in service responses
        success, response = self.make_request("GET", "/services")
        if success and response.status_code == 200:
            data = response.json()
            services = data.get("services", [])
            
            arabic_found = False
            for service in services:
                if any("خدمة" in str(value) or "توصيل" in str(value) or "النقل" in str(value) 
                      for value in service.values() if isinstance(value, str)):
                    arabic_found = True
                    break
            
            if arabic_found:
                self.log_result("Arabic language support", True, "Arabic text found in service descriptions")
            else:
                self.log_result("Arabic language support", False, "No Arabic text found in services")
        else:
            self.log_result("Arabic language support", False, "Could not test Arabic support")
    
    def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        print("🚗 Starting Abu Al-Gharbiya (أبو الغربية) Comprehensive Backend Tests")
        print("=" * 70)
        
        # Basic health and configuration tests
        self.test_health_endpoints()
        self.test_vehicle_types_and_pricing()
        self.test_package_sizes_and_pricing()
        
        # User management and authentication
        self.test_user_registration_and_authentication()
        self.test_driver_capabilities_setup()
        
        # Advanced ride features
        self.test_advanced_ride_features()
        
        # Comprehensive delivery system
        self.test_delivery_service_system()
        self.test_package_tracking()
        self.test_driver_delivery_workflow()
        
        # Real-time communication (focus area)
        self.test_websocket_communication()
        self.test_unified_chat_system()
        
        # Rating system
        self.test_unified_rating_system()
        
        # Arabic language support
        self.test_arabic_language_support()
        
        # Print comprehensive summary
        print("\n" + "=" * 70)
        print("🏁 COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Total: {self.results['passed'] + self.results['failed']}")
        
        if self.results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100 if (self.results['passed'] + self.results['failed']) > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        # Specific focus on Real-time Communication
        websocket_tests = [error for error in self.results['errors'] if 'websocket' in error.lower() or 'chat' in error.lower()]
        if websocket_tests:
            print(f"\n⚠️  Real-time Communication Issues: {len(websocket_tests)} tests failed")
        else:
            print(f"\n✅ Real-time Communication: All tests passed")
        
        return self.results

if __name__ == "__main__":
    tester = AbuAlGharbiyaAPITester()
    results = tester.run_comprehensive_tests()