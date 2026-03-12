module.exports = `
=============================================================
  EBUN FREIGHT OPC — AI ASSISTANT KNOWLEDGE BASE (ADMIN)
  (Internal: Admins & Head Admins — Full Access)
=============================================================

-----------------------------------------------------------
SECTION 1: ABOUT EBUN FREIGHT OPC
-----------------------------------------------------------
Name: Ebun Freight OPC
Type: Modern transportation and logistics company
Headquarters: Bisal, Manaoag, Pangasinan, Philippines
Established: 2026
Founder & CEO: John Robert Mangsat Ocumen
Contact: +639 9563 4027
Tagline: "Where Safety Leads, Technology Drives, and Community Thrives"
Brand Inspiration: The eagle — symbolizing strength, clarity, and forward vision
Live platform: https://ebun-monitoring.vercel.app
Lead Developer: Euro Abao
Co-Developer: Andrew Lacambra
QA: Chairles Adane

COMPANY DESCRIPTION:
Ebun Freight OPC is a modern transportation and logistics company committed to delivering safe, reliable, and technology-driven freight solutions across the Philippines. We specialize in trucking solutions designed to meet the needs of a rapidly evolving supply chain. With a commitment to excellence and integrity, we deliver freight with precision while ensuring the highest standards of operational safety.

OBJECTIVE:
To deliver reliable, efficient, and future-ready freight solutions by prioritizing safety, leveraging cutting-edge technology, and fostering meaningful connections within the communities we serve.

MISSION:
To redefine the standards of modern trucking by leading with uncompromising safety, driving innovation through advanced technologies, and strengthening the communities that power our industry. We are committed to operating with integrity, supporting our drivers, and providing customers with dependable, technology-driven logistics solutions.

VISION:
To become a national leader in sustainable and intelligent freight transportation — where the safest operations, the most advanced technologies, and deep community partnerships shape the future of trucking.

CORE VALUES:
1. Safety First — Protecting drivers, customers, and communities in every decision.
2. Innovation-Driven — Advanced technologies and data-driven insights for smarter freight.
3. Integrity & Accountability — Transparency and professionalism, mile after mile.
4. Community Commitment — Uplifting local families, empowering drivers, strengthening the industry.
5. Excellence in Service — Dependable, high-quality service as a long-term trusted partner.
6. Sustainability & Responsibility — Reducing environmental impact through responsible trucking.

-----------------------------------------------------------
SECTION 2: USER ROLES & PERMISSIONS
-----------------------------------------------------------
There are 4 roles in the system:

1. HEAD ADMIN
   - Full access to all features and all data
   - Can create, update, hard delete, and soft delete any user (including other admins)
   - Only role that can change any user's role
   - Only role that can permanently (hard) delete accounts
   - Only role that can restore soft-deleted users
   - Can manage all drivers, trucks, and deployments
   - Cannot demote or delete the last remaining head admin

2. ADMIN
   - Can manage drivers, trucks, and deployments
   - Can create, update, and soft delete visitor and subcon accounts only
   - Cannot manage other admin or head_admin accounts
   - Cannot change user roles (head_admin only)
   - Cannot hard delete any user

3. VISITOR
   - View-only access to the platform
   - Can browse deployments, drivers, and trucks
   - Cannot make any changes
   - Account starts as "pending" on registration

4. SUBCON (Subcontractor)
   - View access scoped to their own company's trucks, drivers, and deployments
   - Dashboard is filtered to show only their subcon's data
   - Cannot access other subcon's data or admin features

ACCOUNT STATUSES:
- pending — newly registered, awaiting admin approval
- active — approved and can log in
- inactive — deactivated by admin
- rejected — registration request denied
- revoked — access removed after previously being active

Status changes trigger automatic email notifications to the user.

-----------------------------------------------------------
SECTION 3: AUTHENTICATION & ACCOUNTS
-----------------------------------------------------------
- Login requires email and password
- Sessions use JWT tokens (expire in 1 day)
- Passwords must be at least 8 characters
- Emails are stored in lowercase (login is case-insensitive)
- Failed login always returns "Invalid email or password" (no info leakage)
- Correct password but inactive/pending/rejected/revoked account shows a specific status message

HOW TO LOG IN:
1. Go to the login page
2. Enter email and password
3. Click Login

HOW TO SIGN UP (visitor self-registration):
1. Go to the Signup page
2. Fill in firstname, lastname, email, phone number, password
3. Submit — account starts as pending
4. Admin approves the account

HOW TO CREATE AN ADMIN / SUBCON ACCOUNT:
- Only head admins can create admin and subcon accounts
- Go to Admin Management or Subcon Management → click Add
- Fill in all details including role and status
- Submit

HOW TO RESET A USER PASSWORD:
- Go to User Management → find the user → edit → set new password
- Admin can reset passwords for visitor and subcon accounts
- Head admin can reset passwords for any account

HOW TO UPDATE ACCOUNT STATUS:
- Go to the relevant management page → find the user → edit → change status
- Admin can update visitor and subcon statuses
- Head admin can update any account's status

PHONE NUMBER FORMAT: 09XXXXXXXXX or +639XXXXXXXXX

-----------------------------------------------------------
SECTION 4: DEPLOYMENTS
-----------------------------------------------------------
A deployment is a full assignment of a truck and driver to deliver cargo from one or more pickup locations to a destination.

DEPLOYMENT CODE FORMAT:
- DP + YYMM + 5-digit sequence
- Example: DP2503000001 (first deployment of March 2025)
- Auto-generated on creation

TMO NUMBER (Truck Movement Order):
- Each pickup stop gets its own unique TMO number
- Format: TMO + YYMM + 5-digit sequence. Example: TMO2503000001
- Auto-generated on creation
- TMO must be exported/printed BEFORE departure time can be logged

DEPLOYMENT STATUSES:
- preparing — truck/driver assigned, not yet departed
- ongoing — truck has departed from the station
- completed — truck has departed from the destination (delivery done)
- canceled — deployment was called off (cancellation reason required)

Status is automatically set based on timeline fields:
- If "departed" is set → status becomes ongoing
- If "destDeparture" is set → status becomes completed
- If manually set to "canceled" → cancellation reason is required

DEPLOYMENT TIMELINE FIELDS:
- departed — when truck left the station (requires TMO to be printed first)
- pickupIn / pickupOut — arrival and departure at each pickup stop
- destArrival — when truck arrived at the destination
- destDeparture — when truck left the destination (triggers completed status)

HOW TO CREATE A DEPLOYMENT:
1. Go to Deployments → click Create Deployment
2. Select truck and driver (both must be "available")
3. Fill in: truck type, helper count
4. Add at least one pickup stop: site, municipality, field contact person & number, scheduled pickup time, estimated weight
5. Fill in: destination, receiving contact person & number, hybrid, territory, flagging
6. Submit — deployment code and TMO numbers are auto-generated

HOW TO UPDATE A DEPLOYMENT:
- Open the deployment → edit the relevant fields
- Timeline fields (departed, destArrival, destDeparture) update the status automatically
- Pickup stop times (pickupIn, pickupOut) can be updated per stop

HOW TO CANCEL A DEPLOYMENT:
- Open the deployment → set status to "canceled"
- A cancellation reason is required
- The assigned truck and driver are automatically set back to "available"

HOW TO DELETE A DEPLOYMENT:
- Only available for non-active deployments
- Soft delete: marks as deleted, hidden from default views
- Deleting a deployment also removes all its associated timeline logs
- The assigned truck and driver are automatically set back to "available"

TRUCK / DRIVER REPLACEMENT:
- Open the deployment → find the Replacement section
- Select replacement truck/driver, enter reason, date, and remarks
- Original truck/driver becomes "available"; replacement becomes "deployed"
- A timeline log entry is automatically created for the replacement
- Trip count increments on the replacement upon completion (not the original)

DEPLOYMENT FILTERS & SEARCH:
- Filter by: status, territory, hybrid, flagging, subcon, date ranges (assigned/departed/completed)
- Search by: deployment code, truck plate, driver name, destination, TMO number, pickup site, municipality

-----------------------------------------------------------
SECTION 5: DRIVERS
-----------------------------------------------------------
DRIVER FIELDS:
- First name, last name (must be unique combination)
- Phone number (Philippine format)
- License number (optional)
- Subcon (which company they belong to)
- Status: available, deployed, unavailable
- Trip count (auto-incremented on deployment completion)
- Profile photo (optional, stored in Cloudinary)

HOW TO ADD A DRIVER:
1. Go to Driver Management → click Add Driver
2. Fill in required fields (name, phone, subcon, status)
3. Optionally upload a profile photo
4. Submit

HOW TO UPDATE A DRIVER:
- Go to Driver Management → find the driver → click edit
- Update any fields → save
- Updatable fields: name, phone, license, subcon, status, trip count, photo

HOW TO DELETE A DRIVER:
- Soft delete: driver is hidden but recoverable
- Hard delete: permanently removed including Cloudinary photo

DRIVER STATUSES:
- available — ready for a new deployment
- deployed — currently on an active deployment
- unavailable — off-duty, inactive, or unavailable

-----------------------------------------------------------
SECTION 6: TRUCKS
-----------------------------------------------------------
TRUCK TYPES: single-tire, elf, forward, 10-wheeler, 12-wheeler, wing-van, L300, multicab

TRUCK FIELDS:
- Plate number (2–7 characters, unique)
- Truck type
- Maximum load (kg)
- Status: available, deployed, unavailable
- Subcon
- Trip count (auto-incremented on deployment completion)
- Truck photo (optional, stored in Cloudinary)

HOW TO ADD A TRUCK:
1. Go to Truck Management → click Add Truck
2. Fill in plate number, truck type, max load, subcon, status
3. Optionally upload a truck photo
4. Submit

HOW TO UPDATE A TRUCK:
- Go to Truck Management → find the truck → click edit
- Updatable fields: plate, type, max load, status, trip count, subcon, photo

HOW TO DELETE A TRUCK:
- Soft delete: hidden but recoverable
- Hard delete: permanently removed including Cloudinary photo

TRUCK STATUSES:
- available — ready for deployment
- deployed — currently on an active deployment
- unavailable — under maintenance or off-fleet

-----------------------------------------------------------
SECTION 7: ACTIVITY LOGS
-----------------------------------------------------------
- Automatically records every significant admin action
- Fields: type, performed by, action description, timestamp, target (deployment/driver/truck/user)
- Only accessible by head_admin and admin roles

LOG TYPES: deployment, driver, truck, visitor, admin, subcon, system_settings

WHAT GETS LOGGED:
- Login and logout events
- Creating, updating, and deleting users, drivers, trucks, deployments
- Deployment status changes, timeline updates, replacements
- System settings changes (add/remove option values)
- Account status changes

FILTERS:
- By type (deployment, driver, truck, visitor, admin, subcon, system_settings)
- By date
- Sort by newest or oldest

-----------------------------------------------------------
SECTION 8: TIMELINE LOGS
-----------------------------------------------------------
- Records every step in a deployment's journey
- Fields: performed by, action, status, timestamp, target deployment

TIMELINE ACTIONS INCLUDE:
- Truck assigned for deployment
- Departed from station
- Arrived at pickup location (Stop #1 / TMO number)
- Departed from pickup location (Stop #1 / TMO number)
- Arrived at destination
- Departed from destination
- Deployment has been canceled
- Deployment resumed as [status]
- Truck [plate] has been replaced to [plate]
- Driver [name] has been replaced to [name]

FILTERS:
- By status, subcon, territory, hybrid, flagging
- By date range
- Search by deployment code, truck plate, driver name, subcon, action text

-----------------------------------------------------------
SECTION 9: SYSTEM SETTINGS
-----------------------------------------------------------
Allows head admins and admins to manage dropdown option values used across forms.

CATEGORIES:
- trucksDrivers — options for fields like subcon names used in driver/truck forms
- deployments — options for territory, hybrid, and flagging fields used in deployments

HOW TO ADD A NEW OPTION VALUE:
1. Go to System Settings
2. Select category and field
3. Type the new value and click Add
- Duplicate values (case-insensitive) are rejected
- Creating a new field + value is handled automatically if the field doesn't exist yet

HOW TO REMOVE AN OPTION VALUE:
1. Go to System Settings
2. Find the field and value
3. Click the delete button

NOTE: Removing an option does not update existing deployments that already used it.

-----------------------------------------------------------
SECTION 10: DASHBOARD & ANALYTICS
-----------------------------------------------------------
The dashboard provides real-time analytics and charts.

OVERVIEW METRICS:
- Total trucks, drivers, users
- Active deployments (preparing + ongoing combined)
- Available, deployed, and unavailable trucks/drivers
- Trucks in maintenance, inactive drivers
- Completed and canceled deployments
- Total sacks and total weight (kg) transported
- Completion rate, cancellation rate, success rate
- Truck and driver utilization rates
- Monthly and yearly deployment counts
- Recent activity (last 24 hours, last 7 days, last 30 days)

CHARTS:
- Weekly deployment trends (last 12 weeks)
- Daily deployment trends (last 30 days)
- Weekly sacks transported
- Weekly weight transported
- Deployment status breakdown (preparing / ongoing / completed / canceled)
- Top 10 pickup sites by count, sacks, and weight
- Truck type distribution
- Truck and driver status charts
- User role and status breakdown
- Subcon performance (deployments, sacks, weight, completion rate)
- Territory, hybrid, and flagging performance and status breakdowns
- Monthly and weekly territory analytics
- Top 20 drivers by trip count

Subcon users see a fully filtered dashboard showing only their own fleet and deployments.

-----------------------------------------------------------
SECTION 11: NAVIGATION (ALL PAGES)
-----------------------------------------------------------
- Dashboard — overview metrics and all charts
- Deployments — create, view, update, and delete deployments
- Driver Management — add, edit, view, soft/hard delete drivers
- Truck Management — add, edit, view, soft/hard delete trucks
- Admin Management — manage admin and head admin accounts (head_admin only)
- Visitor Management — manage visitor accounts
- Subcon Management — manage subcontractor accounts
- Assign Drivers Page — assign drivers to trips
- Calendar Page — view deployment schedule calendar
- Overview Page — high-level fleet overview
- Activity Logs — full audit trail of all admin actions
- Timeline Logs — deployment step-by-step history
- System Settings — manage dropdown option values
- My Profile — view and update your own account details

-----------------------------------------------------------
SECTION 12: FULL FAQ (ADMIN)
-----------------------------------------------------------

Q: How do I create a deployment?
A: Go to Deployments → Create Deployment. Select an available truck and driver, add at least one pickup stop, fill in the destination and classification fields, then submit.

Q: How do I mark a deployment as completed?
A: Open the deployment and set the "Departed from Destination" (destDeparture) time. This automatically changes the status to completed.

Q: How do I cancel a deployment?
A: Open the deployment, set the status to canceled, and enter a cancellation reason (required). The truck and driver are automatically freed.

Q: Why can't I set the departure time?
A: The TMO must be exported or printed first. Click Export TMO, then set the departed time.

Q: How do I replace a truck or driver mid-deployment?
A: Open the deployment → go to the Replacement section → select the new truck or driver → enter the reason, date, and remarks → save. A timeline log is created automatically.

Q: How do I add a new driver or truck?
A: Go to Driver Management or Truck Management → click the Add button → fill in the required fields → submit.

Q: How do I approve a visitor's account?
A: Go to Visitor Management → find the pending user → edit → change status to "active" → save. The user will receive an email notification.

Q: How do I create an admin account?
A: Only head admins can do this. Go to Admin Management → Add → fill in the details with the appropriate role → submit.

Q: How do I reset a user's password?
A: Go to the relevant management page → find the user → edit → enter a new password and confirm it → save.

Q: How do I manage dropdown options (e.g. territory, subcon names)?
A: Go to System Settings → select the category and field → add or remove values as needed.

Q: How do I view who did what and when?
A: Go to Activity Logs. Filter by type or date to narrow down results.

Q: How do I view the full journey of a deployment?
A: Go to Timeline Logs and search for the deployment, or open the deployment details directly to see its timeline.

Q: What happens when I delete a deployment?
A: The deployment is soft deleted (hidden from default views), its timeline logs are removed, and the assigned truck and driver are freed. It is not permanently deleted unless hard deleted.

Q: Can I recover a soft-deleted driver, truck, or user?
A: Yes. Contact or act as the head admin. Soft-deleted records can be restored. Hard-deleted records are permanent.

Q: What is the difference between soft delete and hard delete?
A: Soft delete hides the record but keeps it in the database (recoverable). Hard delete permanently removes the record and any associated files (like Cloudinary photos). Only head admins can hard delete users.

Q: How does trip count work?
A: Trip count increments automatically on the active driver and truck when a deployment is marked as completed. If a replacement was made, the trip count goes to the replacement, not the original.

Q: What phone number format is required?
A: Philippine format: 09XXXXXXXXX or +639XXXXXXXXX

Q: Who do I contact for platform support?
A: Reach out to the Ebun Freight team at +639 9563 4027 or escalate internally to the head admin.
`
