#!/usr/bin/env python3
"""
Orange Bus Backend API Testing Suite
Tests the ride-sharing app backend for Anbar Governorate, Iraq
"""

import requests
import json
import time
import random
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://rideshare-iraq.preview.emergentagent.com/api"
TIMEOUT = 30

class OrangeBusAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.passenger_token = None
        self.driver_token = None
        self.passenger_id = None
        self.driver_id = None
        self.test_ride_id = None
        self.test_suffix = str(random.randint(1000, 9999))  # Unique suffix for each test run
        self.passenger_phone = f"+96477012{self.test_suffix}"
        self.driver_phone = f"+96477123{self.test_suffix}"
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
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> tuple:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=TIMEOUT)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=TIMEOUT)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=TIMEOUT)
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
            if "Orange Bus" in data.get("message", ""):
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
    
    def test_passenger_registration(self):
        """Test passenger registration"""
        print("\n=== Testing Passenger Registration ===")
        
        passenger_data = {
            "name": "أحمد محمد العراقي",
            "phone": self.passenger_phone,
            "email": f"ahmed.iraqi{self.test_suffix}@gmail.com",
            "user_type": "passenger",
            "password": "SecurePass123!"
        }
        
        success, response = self.make_request("POST", "/auth/register", passenger_data)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("access_token") and data.get("user"):
                self.passenger_token = data["access_token"]
                self.passenger_id = data["user"]["id"]
                self.log_result("Passenger registration", True, f"User ID: {self.passenger_id}")
            else:
                self.log_result("Passenger registration", False, "Missing token or user data")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Passenger registration", False, error_msg)
    
    def test_driver_registration(self):
        """Test driver registration"""
        print("\n=== Testing Driver Registration ===")
        
        driver_data = {
            "name": "سعد علي الأنباري",
            "phone": self.driver_phone,
            "email": f"saad.driver{self.test_suffix}@gmail.com",
            "user_type": "driver",
            "password": "DriverPass456!"
        }
        
        success, response = self.make_request("POST", "/auth/register", driver_data)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("access_token") and data.get("user"):
                self.driver_token = data["access_token"]
                self.driver_id = data["user"]["id"]
                self.log_result("Driver registration", True, f"User ID: {self.driver_id}")
            else:
                self.log_result("Driver registration", False, "Missing token or user data")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Driver registration", False, error_msg)
    
    def test_duplicate_registration(self):
        """Test duplicate phone number registration"""
        print("\n=== Testing Duplicate Registration ===")
        
        duplicate_data = {
            "name": "محاولة مكررة",
            "phone": "+964770123456",  # Same as passenger
            "user_type": "passenger",
            "password": "AnotherPass789!"
        }
        
        success, response = self.make_request("POST", "/auth/register", duplicate_data)
        if success and response.status_code == 400:
            self.log_result("Duplicate registration prevention", True, "Correctly rejected duplicate phone")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Duplicate registration prevention", False, f"Should have failed: {error_msg}")
    
    def test_login(self):
        """Test user login"""
        print("\n=== Testing Login ===")
        
        # Test passenger login
        login_data = {
            "phone": "+964770123456",
            "password": "SecurePass123!"
        }
        
        success, response = self.make_request("POST", "/auth/login", login_data)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("access_token") and data.get("user"):
                self.log_result("Passenger login", True, "Login successful")
            else:
                self.log_result("Passenger login", False, "Missing token or user data")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Passenger login", False, error_msg)
        
        # Test invalid login
        invalid_login = {
            "phone": "+964770123456",
            "password": "WrongPassword"
        }
        
        success, response = self.make_request("POST", "/auth/login", invalid_login)
        if success and response.status_code == 401:
            self.log_result("Invalid login rejection", True, "Correctly rejected wrong password")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Invalid login rejection", False, f"Should have failed: {error_msg}")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        print("\n=== Testing Current User Info ===")
        
        if not self.passenger_token:
            self.log_result("Get current user", False, "No passenger token available")
            return
        
        success, response = self.make_request("GET", "/auth/me", token=self.passenger_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("name") == "أحمد محمد العراقي":
                self.log_result("Get current user", True, "User info retrieved correctly")
            else:
                self.log_result("Get current user", False, f"Wrong user data: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Get current user", False, error_msg)
    
    def test_unauthorized_access(self):
        """Test unauthorized access"""
        print("\n=== Testing Unauthorized Access ===")
        
        success, response = self.make_request("GET", "/auth/me")
        if success and response.status_code == 403:
            self.log_result("Unauthorized access prevention", True, "Correctly rejected request without token")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Unauthorized access prevention", False, f"Should have failed: {error_msg}")
    
    def test_profile_update(self):
        """Test profile update"""
        print("\n=== Testing Profile Update ===")
        
        if not self.passenger_token:
            self.log_result("Profile update", False, "No passenger token available")
            return
        
        update_data = {
            "name": "أحمد محمد العراقي المحدث",
            "phone": "+964770123456",
            "email": "ahmed.updated@gmail.com",
            "user_type": "passenger"
        }
        
        success, response = self.make_request("PUT", "/users/profile", update_data, self.passenger_token)
        if success and response.status_code == 200:
            data = response.json()
            if "المحدث" in data.get("name", ""):
                self.log_result("Profile update", True, "Profile updated successfully")
            else:
                self.log_result("Profile update", False, f"Name not updated: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Profile update", False, error_msg)
    
    def test_driver_info_update(self):
        """Test driver info update"""
        print("\n=== Testing Driver Info Update ===")
        
        if not self.driver_token:
            self.log_result("Driver info update", False, "No driver token available")
            return
        
        driver_info = {
            "license_number": "AN123456789",
            "car_model": "Toyota Corolla 2020",
            "car_color": "أبيض",
            "car_plate": "أنبار 12345",
            "is_available": True
        }
        
        success, response = self.make_request("PUT", "/drivers/info", driver_info, self.driver_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("driver_info", {}).get("car_model") == "Toyota Corolla 2020":
                self.log_result("Driver info update", True, "Driver info updated successfully")
            else:
                self.log_result("Driver info update", False, f"Driver info not updated: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Driver info update", False, error_msg)
    
    def test_driver_availability_toggle(self):
        """Test driver availability toggle"""
        print("\n=== Testing Driver Availability Toggle ===")
        
        if not self.driver_token:
            self.log_result("Driver availability toggle", False, "No driver token available")
            return
        
        success, response = self.make_request("PUT", "/drivers/availability?is_available=true", token=self.driver_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("is_available") == True:
                self.log_result("Driver availability toggle", True, "Availability updated successfully")
            else:
                self.log_result("Driver availability toggle", False, f"Availability not updated: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Driver availability toggle", False, error_msg)
    
    def test_passenger_ride_request(self):
        """Test passenger ride request"""
        print("\n=== Testing Ride Request ===")
        
        if not self.passenger_token:
            self.log_result("Ride request", False, "No passenger token available")
            return
        
        ride_data = {
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
            "passenger_notes": "أرجو الانتظار عند البوابة الرئيسية"
        }
        
        success, response = self.make_request("POST", "/rides/request", ride_data, self.passenger_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("status") == "requested" and data.get("estimated_fare"):
                self.test_ride_id = data["id"]
                self.log_result("Ride request", True, f"Ride requested with ID: {self.test_ride_id}")
            else:
                self.log_result("Ride request", False, f"Invalid ride data: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Ride request", False, error_msg)
    
    def test_driver_view_available_rides(self):
        """Test driver viewing available rides"""
        print("\n=== Testing Available Rides View ===")
        
        if not self.driver_token:
            self.log_result("View available rides", False, "No driver token available")
            return
        
        success, response = self.make_request("GET", "/rides/available", token=self.driver_token)
        if success and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("View available rides", True, f"Found {len(data)} available rides")
            else:
                self.log_result("View available rides", True, "No available rides (expected if none requested)")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("View available rides", False, error_msg)
    
    def test_driver_accept_ride(self):
        """Test driver accepting a ride"""
        print("\n=== Testing Ride Acceptance ===")
        
        if not self.driver_token or not self.test_ride_id:
            self.log_result("Ride acceptance", False, "No driver token or ride ID available")
            return
        
        success, response = self.make_request("PUT", f"/rides/{self.test_ride_id}/accept", token=self.driver_token)
        if success and response.status_code == 200:
            data = response.json()
            if "accepted" in data.get("message", "").lower():
                self.log_result("Ride acceptance", True, "Ride accepted successfully")
            else:
                self.log_result("Ride acceptance", False, f"Unexpected response: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Ride acceptance", False, error_msg)
    
    def test_ride_status_update(self):
        """Test ride status updates"""
        print("\n=== Testing Ride Status Updates ===")
        
        if not self.driver_token or not self.test_ride_id:
            self.log_result("Ride status update", False, "No driver token or ride ID available")
            return
        
        # Update to in_progress
        success, response = self.make_request("PUT", f"/rides/{self.test_ride_id}/status?status=in_progress", token=self.driver_token)
        if success and response.status_code == 200:
            self.log_result("Ride status to in_progress", True, "Status updated to in_progress")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Ride status to in_progress", False, error_msg)
        
        # Update to completed
        success, response = self.make_request("PUT", f"/rides/{self.test_ride_id}/status?status=completed", token=self.driver_token)
        if success and response.status_code == 200:
            self.log_result("Ride status to completed", True, "Status updated to completed")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Ride status to completed", False, error_msg)
    
    def test_ride_history(self):
        """Test getting ride history"""
        print("\n=== Testing Ride History ===")
        
        # Test passenger ride history
        if self.passenger_token:
            success, response = self.make_request("GET", "/rides/my-rides", token=self.passenger_token)
            if success and response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Passenger ride history", True, f"Retrieved {len(data)} rides")
                else:
                    self.log_result("Passenger ride history", False, f"Invalid response format: {data}")
            else:
                error_msg = response.text if success else str(response)
                self.log_result("Passenger ride history", False, error_msg)
        
        # Test driver ride history
        if self.driver_token:
            success, response = self.make_request("GET", "/rides/my-rides", token=self.driver_token)
            if success and response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Driver ride history", True, f"Retrieved {len(data)} rides")
                else:
                    self.log_result("Driver ride history", False, f"Invalid response format: {data}")
            else:
                error_msg = response.text if success else str(response)
                self.log_result("Driver ride history", False, error_msg)
    
    def test_rating_system(self):
        """Test rating system"""
        print("\n=== Testing Rating System ===")
        
        if not self.passenger_token or not self.test_ride_id:
            self.log_result("Rating system", False, "No passenger token or ride ID available")
            return
        
        rating_data = {
            "ride_id": self.test_ride_id,
            "rating": 5,
            "comment": "سائق ممتاز ومهذب، وصل في الوقت المحدد"
        }
        
        success, response = self.make_request("POST", "/ratings", rating_data, self.passenger_token)
        if success and response.status_code == 200:
            data = response.json()
            if data.get("rating") == 5:
                self.log_result("Rating creation", True, "Rating created successfully")
            else:
                self.log_result("Rating creation", False, f"Invalid rating data: {data}")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Rating creation", False, error_msg)
    
    def test_passenger_cannot_access_driver_endpoints(self):
        """Test that passengers cannot access driver-only endpoints"""
        print("\n=== Testing Access Control ===")
        
        if not self.passenger_token:
            self.log_result("Access control test", False, "No passenger token available")
            return
        
        # Try to access driver availability endpoint as passenger
        success, response = self.make_request("PUT", "/drivers/availability?is_available=true", token=self.passenger_token)
        if success and response.status_code == 403:
            self.log_result("Passenger access control", True, "Correctly blocked passenger from driver endpoint")
        else:
            error_msg = response.text if success else str(response)
            self.log_result("Passenger access control", False, f"Should have blocked access: {error_msg}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚌 Starting Orange Bus Backend API Tests")
        print("=" * 50)
        
        # Basic health tests
        self.test_health_endpoints()
        
        # Authentication tests
        self.test_passenger_registration()
        self.test_driver_registration()
        self.test_duplicate_registration()
        self.test_login()
        self.test_get_current_user()
        self.test_unauthorized_access()
        
        # User management tests
        self.test_profile_update()
        self.test_driver_info_update()
        self.test_driver_availability_toggle()
        
        # Ride management tests
        self.test_passenger_ride_request()
        self.test_driver_view_available_rides()
        self.test_driver_accept_ride()
        self.test_ride_status_update()
        self.test_ride_history()
        
        # Rating system tests
        self.test_rating_system()
        
        # Access control tests
        self.test_passenger_cannot_access_driver_endpoints()
        
        # Print summary
        print("\n" + "=" * 50)
        print("🏁 TEST SUMMARY")
        print("=" * 50)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Total: {self.results['passed'] + self.results['failed']}")
        
        if self.results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return self.results

if __name__ == "__main__":
    tester = OrangeBusAPITester()
    results = tester.run_all_tests()