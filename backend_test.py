#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class TravaholicStaysAPITester:
    def __init__(self, base_url="https://villas-dashboard.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(test_name)
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")

    def test_api_endpoint(self, method, endpoint, expected_status, data=None, headers=None, test_name=None):
        """Generic API test method"""
        url = f"{self.api_url}/{endpoint}"
        if not headers:
            headers = {'Content-Type': 'application/json'}
        
        if not test_name:
            test_name = f"{method} {endpoint}"

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            if not success and response.text:
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', response.text[:100])}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_result(test_name, success, details if not success else "")
            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.log_result(test_name, False, f"Exception: {str(e)}")
            return False, {}

    def test_villas_api(self):
        """Test villas endpoints"""
        print("\n🏠 Testing Villas API...")
        
        # Test get all villas
        success, data = self.test_api_endpoint('GET', 'villas', 200, test_name="Get all villas")
        if success:
            villas = data.get('villas', [])
            print(f"   Found {len(villas)} villas")
            
            # Test get villa by ID if villas exist
            if villas:
                villa_id = villas[0]['villa_id']
                self.test_api_endpoint('GET', f'villas/{villa_id}', 200, test_name="Get villa by ID")
                
                # Test get villa by slug
                villa_slug = villas[0]['slug']
                self.test_api_endpoint('GET', f'villas/slug/{villa_slug}', 200, test_name="Get villa by slug")
                
                # Test villa availability
                self.test_api_endpoint('GET', f'villas/{villa_id}/availability', 200, test_name="Get villa availability")

        # Test villas with filters
        self.test_api_endpoint('GET', 'villas?location=Goa', 200, test_name="Get villas with location filter")
        self.test_api_endpoint('GET', 'villas?has_pool=true', 200, test_name="Get villas with pool filter")
        self.test_api_endpoint('GET', 'villas?min_guests=4', 200, test_name="Get villas with guest filter")

    def test_addons_api(self):
        """Test add-ons endpoints"""
        print("\n🎯 Testing Add-ons API...")
        
        success, data = self.test_api_endpoint('GET', 'addons', 200, test_name="Get all add-ons")
        if success:
            addons = data.get('addons', [])
            print(f"   Found {len(addons)} add-ons")

        # Test with category filter
        self.test_api_endpoint('GET', 'addons?category=meals', 200, test_name="Get add-ons by category")

    def test_leads_api(self):
        """Test leads endpoints"""
        print("\n📞 Testing Leads API...")
        
        # Test create lead (guest callback)
        lead_data = {
            "name": "Test Guest",
            "phone": "+919876543210",
            "email": "test@example.com",
            "preferred_time": "Evening",
            "lead_type": "guest",
            "message": "Interested in booking a villa"
        }
        self.test_api_endpoint('POST', 'leads', 200, data=lead_data, test_name="Create guest lead")

        # Test create homeowner lead
        homeowner_lead = {
            "name": "Test Owner",
            "phone": "+919876543211",
            "email": "owner@example.com",
            "lead_type": "homeowner",
            "message": "Want to list my villa"
        }
        self.test_api_endpoint('POST', 'leads', 200, data=homeowner_lead, test_name="Create homeowner lead")

    def test_list_villa_api(self):
        """Test list villa endpoint"""
        print("\n🏡 Testing List Villa API...")
        
        villa_listing = {
            "owner_name": "Test Villa Owner",
            "owner_email": "villaowner@example.com",
            "owner_phone": "+919876543212",
            "villa_name": "Test Luxury Villa",
            "villa_location": "Goa",
            "bedrooms": 3,
            "bathrooms": 3,
            "has_pool": True,
            "amenities": ["WiFi", "AC", "Kitchen"],
            "description": "Beautiful villa for rent"
        }
        self.test_api_endpoint('POST', 'list-villa', 200, data=villa_listing, test_name="Submit villa listing")

    def test_pricing_calculation(self):
        """Test booking price calculation"""
        print("\n💰 Testing Pricing Calculation...")
        
        # First get a villa to test with
        success, data = self.test_api_endpoint('GET', 'villas?limit=1', 200)
        if success and data.get('villas'):
            villa = data['villas'][0]
            villa_id = villa['villa_id']
            
            # Test price calculation
            pricing_data = {
                "villa_id": villa_id,
                "check_in": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                "check_out": (datetime.now() + timedelta(days=9)).strftime("%Y-%m-%d"),
                "addons": []
            }
            success, pricing = self.test_api_endpoint('POST', 'bookings/calculate-price', 200, 
                                                    data=pricing_data, test_name="Calculate booking price")
            if success:
                print(f"   Calculated price: ₹{pricing.get('total_amount', 0)}")

    def test_locations_and_amenities(self):
        """Test locations and amenities endpoints"""
        print("\n📍 Testing Locations & Amenities...")
        
        self.test_api_endpoint('GET', 'locations', 200, test_name="Get locations")
        self.test_api_endpoint('GET', 'amenities', 200, test_name="Get amenities")

    def test_seed_data(self):
        """Test seed data endpoint"""
        print("\n🌱 Testing Seed Data...")
        
        self.test_api_endpoint('POST', 'seed-data', 200, test_name="Seed sample data")

    def test_invalid_endpoints(self):
        """Test invalid endpoints return proper errors"""
        print("\n🚫 Testing Error Handling...")
        
        self.test_api_endpoint('GET', 'villas/invalid-id', 404, test_name="Get non-existent villa")
        self.test_api_endpoint('GET', 'villas/slug/invalid-slug', 404, test_name="Get villa with invalid slug")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Travaholic Stays API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test public endpoints
        self.test_villas_api()
        self.test_addons_api()
        self.test_leads_api()
        self.test_list_villa_api()
        self.test_pricing_calculation()
        self.test_locations_and_amenities()
        self.test_seed_data()
        self.test_invalid_endpoints()

        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure['test']}: {failure['details']}")

        return self.tests_passed, self.tests_run, self.failed_tests, self.passed_tests

def main():
    tester = TravaholicStaysAPITester()
    passed, total, failed, passed_list = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())