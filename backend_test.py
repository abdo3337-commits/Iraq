#!/usr/bin/env python3
"""
Orange Bus Backend API Testing Suite
Tests all API endpoints for the Orange Bus platform
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class OrangeBusAPITester:
    def __init__(self, base_url="https://bus-tracker-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        
        # Test accounts as mentioned in the request
        self.test_accounts = {
            'admin': {'email': 'admin@orangebus.com', 'password': 'admin123'},
            'passenger': {'email': 'passenger@test.com', 'password': 'test123'},
            'driver': {'email': 'driver@test.com', 'password': 'test123'}
        }

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self) -> bool:
        """Test health check endpoint"""
        success, data = self.make_request('GET', '/health')
        return self.log_test("Health Check", success, f"- {data.get('message', '')}")

    def test_districts_endpoint(self) -> bool:
        """Test districts endpoint"""
        success, data = self.make_request('GET', '/districts')
        if success:
            districts = data.get('districts', [])
            pricing = data.get('pricing', {})
            details = f"- Found {len(districts)} districts with pricing"
            # Verify expected districts
            expected_districts = ['الرمادي', 'هيت', 'الفلوجة', 'الكرمة', 'راوة', 'القائم', 'حديثة', 'الخالدية', 'عنة', 'الكبيسة']
            missing = [d for d in expected_districts if d not in districts]
            if missing:
                details += f", Missing: {missing}"
                success = False
        else:
            details = f"- Error: {data}"
        
        return self.log_test("Districts Endpoint", success, details)

    def test_calculate_fare(self) -> bool:
        """Test fare calculation endpoint"""
        test_cases = [
            {
                "name": "Instant trip in الرمادي",
                "data": {
                    "trip_type": "instant",
                    "district": "الرمادي",
                    "distance_km": 5.0,
                    "duration_minutes": 15.0,
                    "pickup_location": {"lat": 33.4206, "lng": 43.3047, "address": "الرمادي المركز"},
                    "destination": {"lat": 33.4306, "lng": 43.3147, "address": "الرمادي الجديدة"}
                },
                "expected_min": 1500  # base price
            },
            {
                "name": "Hourly trip in هيت",
                "data": {
                    "trip_type": "hourly",
                    "district": "هيت",
                    "distance_km": 10.0,
                    "hourly_duration": 2,
                    "pickup_location": {"lat": 33.6378, "lng": 42.8256, "address": "هيت المركز"}
                },
                "expected_min": 20000  # 2 hours * 10000
            },
            {
                "name": "Task trip in الفلوجة",
                "data": {
                    "trip_type": "task",
                    "district": "الفلوجة",
                    "pickup_location": {"lat": 33.3506, "lng": 43.7789, "address": "الفلوجة المركز"}
                },
                "expected_min": 2000  # base task price
            }
        ]
        
        all_passed = True
        for case in test_cases:
            success, data = self.make_request('POST', '/calculate-fare', case["data"])
            if success:
                price = data.get('estimated_price', 0)
                if price >= case["expected_min"]:
                    details = f"- Price: {price} IQD"
                else:
                    success = False
                    details = f"- Price too low: {price} < {case['expected_min']}"
            else:
                details = f"- Error: {data}"
            
            test_passed = self.log_test(f"Calculate Fare - {case['name']}", success, details)
            all_passed = all_passed and test_passed
        
        return all_passed

    def test_user_registration(self) -> bool:
        """Test user registration for different roles"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_users = [
            {
                "role": "passenger",
                "data": {
                    "name": f"Test Passenger {timestamp}",
                    "email": f"test_passenger_{timestamp}@test.com",
                    "phone": f"07901234{timestamp[-3:]}",
                    "password": "testpass123",
                    "role": "passenger"
                }
            },
            {
                "role": "driver", 
                "data": {
                    "name": f"Test Driver {timestamp}",
                    "email": f"test_driver_{timestamp}@test.com",
                    "phone": f"07901235{timestamp[-3:]}",
                    "password": "testpass123",
                    "role": "driver"
                }
            }
        ]
        
        all_passed = True
        for user_info in test_users:
            success, data = self.make_request('POST', '/auth/register', user_info["data"], expected_status=200)
            if success:
                user_id = data.get('id')
                details = f"- Created {user_info['role']} with ID: {user_id}"
                # Store for later login tests
                self.users[f"test_{user_info['role']}"] = {
                    'email': user_info["data"]["email"],
                    'password': user_info["data"]["password"],
                    'role': user_info["data"]["role"]
                }
            else:
                details = f"- Error: {data}"
            
            test_passed = self.log_test(f"Register {user_info['role'].title()}", success, details)
            all_passed = all_passed and test_passed
        
        return all_passed

    def test_user_login(self) -> bool:
        """Test login for all user types"""
        all_passed = True
        
        # Test predefined accounts first
        for role, credentials in self.test_accounts.items():
            success, data = self.make_request('POST', '/auth/login', credentials)
            if success:
                token = data.get('access_token')
                user_data = data.get('user', {})
                if token and user_data.get('role') == role:
                    self.tokens[role] = token
                    details = f"- Token received, Role: {user_data.get('role')}"
                else:
                    success = False
                    details = f"- Invalid response structure"
            else:
                details = f"- Error: {data}"
            
            test_passed = self.log_test(f"Login {role.title()}", success, details)
            all_passed = all_passed and test_passed
        
        # Test newly registered users
        for user_key, user_info in self.users.items():
            success, data = self.make_request('POST', '/auth/login', {
                'email': user_info['email'],
                'password': user_info['password']
            })
            if success:
                token = data.get('access_token')
                if token:
                    self.tokens[user_key] = token
                    details = f"- New user login successful"
                else:
                    success = False
                    details = f"- No token received"
            else:
                details = f"- Error: {data}"
            
            test_passed = self.log_test(f"Login New {user_info['role'].title()}", success, details)
            all_passed = all_passed and test_passed
        
        return all_passed

    def test_protected_endpoints(self) -> bool:
        """Test protected endpoints with authentication"""
        if 'passenger' not in self.tokens:
            return self.log_test("Protected Endpoints", False, "- No passenger token available")
        
        all_passed = True
        
        # Test /auth/me endpoint
        success, data = self.make_request('GET', '/auth/me', token=self.tokens['passenger'])
        test_passed = self.log_test("Get Current User Info", success, f"- User: {data.get('name', 'Unknown')}")
        all_passed = all_passed and test_passed
        
        # Test wallet balance
        success, data = self.make_request('GET', '/wallet/balance', token=self.tokens['passenger'])
        test_passed = self.log_test("Get Wallet Balance", success, f"- Balance: {data.get('balance', 0)} IQD")
        all_passed = all_passed and test_passed
        
        # Test wallet transactions
        success, data = self.make_request('GET', '/wallet/transactions', token=self.tokens['passenger'])
        test_passed = self.log_test("Get Wallet Transactions", success, f"- Found {len(data) if isinstance(data, list) else 0} transactions")
        all_passed = all_passed and test_passed
        
        return all_passed

    def test_admin_endpoints(self) -> bool:
        """Test admin-only endpoints"""
        if 'admin' not in self.tokens:
            return self.log_test("Admin Endpoints", False, "- No admin token available")
        
        all_passed = True
        
        # Test admin stats
        success, data = self.make_request('GET', '/admin/stats', token=self.tokens['admin'])
        if success:
            stats = {
                'users': data.get('total_users', 0),
                'drivers': data.get('total_drivers', 0),
                'trips': data.get('total_trips', 0)
            }
            details = f"- Users: {stats['users']}, Drivers: {stats['drivers']}, Trips: {stats['trips']}"
        else:
            details = f"- Error: {data}"
        test_passed = self.log_test("Admin Stats", success, details)
        all_passed = all_passed and test_passed
        
        # Test get all users
        success, data = self.make_request('GET', '/admin/users', token=self.tokens['admin'])
        test_passed = self.log_test("Admin Get Users", success, f"- Found {len(data) if isinstance(data, list) else 0} users")
        all_passed = all_passed and test_passed
        
        return all_passed

    def test_trip_creation(self) -> bool:
        """Test trip creation (requires passenger token)"""
        if 'passenger' not in self.tokens:
            return self.log_test("Trip Creation", False, "- No passenger token available")
        
        trip_data = {
            "trip_type": "instant",
            "pickup_location": {
                "lat": 33.4206,
                "lng": 43.3047,
                "address": "الرمادي المركز"
            },
            "destination": {
                "lat": 33.4306,
                "lng": 43.3147,
                "address": "الرمادي الجديدة"
            },
            "district": "الرمادي",
            "distance_km": 5.0,
            "duration_minutes": 15.0
        }
        
        success, data = self.make_request('POST', '/trips', trip_data, token=self.tokens['passenger'], expected_status=200)
        if success:
            trip_id = data.get('id')
            estimated_price = data.get('estimated_price', 0)
            details = f"- Trip ID: {trip_id}, Price: {estimated_price} IQD"
        else:
            details = f"- Error: {data}"
        
        return self.log_test("Create Trip", success, details)

    def run_all_tests(self) -> bool:
        """Run all backend tests"""
        print("🚍 Starting Orange Bus Backend API Tests")
        print("=" * 50)
        
        # Basic endpoint tests (no auth required)
        print("\n📋 Testing Basic Endpoints...")
        self.test_health_check()
        self.test_districts_endpoint()
        self.test_calculate_fare()
        
        # Authentication tests
        print("\n🔐 Testing Authentication...")
        self.test_user_registration()
        self.test_user_login()
        
        # Protected endpoint tests
        print("\n🔒 Testing Protected Endpoints...")
        self.test_protected_endpoints()
        self.test_trip_creation()
        
        # Admin tests
        print("\n👨‍💼 Testing Admin Endpoints...")
        self.test_admin_endpoints()
        
        # Final results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is working correctly.")
            return True
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️  {failed} test(s) failed. Please check the issues above.")
            return False

def main():
    """Main test execution"""
    tester = OrangeBusAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())