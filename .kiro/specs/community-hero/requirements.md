# Requirements Document

## Introduction

Community Hero is a hyperlocal civic issue reporting platform delivered as a mobile-first Progressive Web App (PWA) for citizens and a companion web dashboard for officials and community validators. The platform enables communities to IDENTIFY, REPORT, VALIDATE, TRACK, and RESOLVE civic issues such as potholes, water leakages, damaged streetlights, waste management concerns, and public infrastructure failures.

The platform is built around three core values: **Transparency** (all AI decisions show reasoning), **Accountability** (department routing, SLA tracking, and proof-of-fix), and **Community Participation** (validation, gamification, and collaboration).

The system's highest-priority differentiator is a five-agent agentic pipeline orchestrated with LangGraph that automates intake, validation, routing, resolution monitoring, and predictive insights. Citizens report issues in the field using camera, GPS, and voice; nearby citizens validate them; issues are auto-routed to responsible departments with SLA deadlines; and resolution is tracked end-to-end with gamified rewards.

This document defines the functional and non-functional requirements for the platform, covering the seven core features, the five-agent pipeline, the official Impact Dashboard, gamification, offline-first support, accessibility, transparency, and the demonstration scenario set in Serilingampalle, Hyderabad.

## Glossary

- **Platform**: The complete Community Hero system, including the mobile PWA, web dashboard, backend services, and agentic pipeline.
- **Mobile_App**: The mobile-first Progressive Web App used by citizens (React + TypeScript + Vite).
- **Web_Dashboard**: The browser-based dashboard used by government officials and community validators.
- **Citizen**: An authenticated end user who reports, validates, tracks, or comments on issues.
- **Official**: An authenticated government department user who views, manages, and resolves assigned issues via the Web_Dashboard.
- **Validator**: A Citizen participating in community validation of reported issues.
- **Issue**: A structured record of a reported civic problem, including type, severity, location, media, and status.
- **Issue_Object**: The structured JSON representation of an Issue produced by the Intake_Agent.
- **Issue_Type**: The category of an Issue (for example, pothole, water leakage, damaged streetlight, waste management, infrastructure failure).
- **Severity**: An integer score from 1 to 5 indicating Issue impact, where 5 is most severe.
- **Status**: The current lifecycle state of an Issue, one of REPORTED, VERIFIED, ASSIGNED, IN_PROGRESS, or RESOLVED.
- **Intake_Agent**: The pipeline agent that accepts media or text and produces a structured Issue_Object using image analysis.
- **Validation_Agent**: The pipeline agent that cross-references existing reports, evaluates geo-clusters, and evaluates community vote thresholds.
- **Routing_Agent**: The pipeline agent that maps an Issue to a responsible Department, computes a Priority_Score, and assigns an SLA_Deadline.
- **Resolution_Agent**: The pipeline agent that monitors SLA breaches, sends department reminders, requests proof-of-fix, and awards rewards on resolution.
- **Insights_Agent**: The nightly batch agent that clusters recurring issues, generates predictive heatmaps, and publishes to the Impact_Dashboard.
- **Pipeline**: The LangGraph-orchestrated sequence of the five agents.
- **Vision_Service**: The image and video analysis service (Google Gemini Pro Vision) used to extract Issue_Type, Severity, and location_hint.
- **Reasoning_Service**: The agentic reasoning service (Claude) used for validation and decision reasoning.
- **RAG_Store**: The vector store (ChromaDB) used to retrieve similar existing reports.
- **Department**: A government body responsible for resolving a category of Issue.
- **Priority_Score**: A computed value equal to Severity multiplied by community_votes multiplied by a time_elapsed factor.
- **SLA_Deadline**: The category-specific deadline by which an assigned Issue should be resolved.
- **Geo_Cluster**: A group of three or more Issues of the same Issue_Type located within 200 meters of each other.
- **Upvote_Threshold**: The count of 10 upvotes at which an Issue is marked VERIFIED and auto-routed.
- **XP**: Experience points awarded to a Citizen for participation actions.
- **Badge**: A named achievement awarded to a Citizen for reaching participation milestones.
- **Leaderboard**: A ranked list of Citizens by XP within a locality or zone.
- **Zone**: A defined geographic area used for clustering, leaderboards, and analytics.
- **Impact_Dashboard**: The 3D city visualization and analytics surface showing aggregate issue data.
- **Offline_Queue**: The local store of reports created while the device has no internet connection, pending synchronization.
- **Sync_Service**: The service (Firebase) that synchronizes queued reports and offline data when connectivity is restored.
- **Auth_Service**: The authentication service (Firebase) that manages Citizen and Official identities.
- **Notification_Service**: The service that delivers push and in-app notifications to Citizens.
- **Reasoning_Explanation**: The human-readable justification accompanying any AI-generated categorization or decision.

## Requirements

### Requirement 1: Intake Agent

**User Story:** As a Citizen, I want the platform to automatically analyze my photo, video, or text report, so that an accurate, structured issue is created without manual data entry.

#### Acceptance Criteria

1. WHEN a Citizen submits an image, video, or text report, THE Intake_Agent SHALL call the Vision_Service to extract Issue_Type, Severity, and location_hint.
2. WHEN the Vision_Service returns an analysis, THE Intake_Agent SHALL generate an Issue_Object in structured JSON containing Issue_Type, Severity, location_hint, and a Reasoning_Explanation.
3. THE Intake_Agent SHALL assign a Severity value as an integer between 1 and 5 inclusive.
4. WHEN the Intake_Agent produces an Issue_Object, THE Intake_Agent SHALL include a Reasoning_Explanation of between 1 and 1000 characters that describes why the Issue_Type and Severity were chosen.
5. IF the Vision_Service returns a confidence score below 0.70 on a 0.0 to 1.0 scale for the Issue_Type, THEN THE Intake_Agent SHALL flag the Issue_Object for manual category confirmation by the Citizen.
6. IF the Vision_Service call fails or does not return a response within 30 seconds, THEN THE Intake_Agent SHALL create the Issue_Object from the available text and location data and record an analysis_failed indicator.
7. WHEN the Intake_Agent completes processing, THE Intake_Agent SHALL set the Issue Status to REPORTED.
8. IF a submitted report file uses an unsupported format or exceeds 50 MB, THEN THE Intake_Agent SHALL reject the submission and return an error indication describing the validation failure without creating an Issue_Object.
9. WHEN a Citizen submits a report, THE Intake_Agent SHALL complete processing and produce an Issue_Object within 60 seconds.

### Requirement 2: Validation Agent

**User Story:** As a community, we want reported issues to be cross-checked against existing reports and community signals, so that duplicates are merged and significant issues are escalated.

#### Acceptance Criteria

1. WHEN an Issue_Object reaches the Validation_Agent, THE Validation_Agent SHALL query the RAG_Store to retrieve up to 50 existing Issues of the same Issue_Type located within 200 meters, within 5 seconds.
2. IF the RAG_Store query fails or times out, THEN THE Validation_Agent SHALL retain the Issue at Status REPORTED, record an error indication describing the failure, and SHALL NOT discard the Issue_Object.
3. IF a retrieved Issue matches the new Issue in Issue_Type and is located within 200 meters, THEN THE Validation_Agent SHALL link the new Issue to the matching Issue as a corroborating report.
4. WHEN three or more Issues of the same Issue_Type exist within a 200 meter radius, THE Validation_Agent SHALL mark the Geo_Cluster for escalation.
5. WHEN an Issue's upvote count is greater than or equal to the Upvote_Threshold of 10, THE Validation_Agent SHALL set the Issue Status to VERIFIED and forward the Issue to the Routing_Agent.
6. WHEN the Validation_Agent escalates a Geo_Cluster, THE Validation_Agent SHALL set the Status of the representative Issue of that Geo_Cluster to VERIFIED.
7. WHEN the Validation_Agent makes an escalation or linking decision, THE Validation_Agent SHALL record a Reasoning_Explanation stating the matched Issue identifiers, Issue_Type, measured distance, and the threshold values applied.
8. WHEN a Citizen views an Issue that the Validation_Agent has linked or escalated, THE Validation_Agent SHALL make the recorded Reasoning_Explanation available for display to the Citizen.

### Requirement 3: Routing Agent

**User Story:** As an Official, I want verified issues automatically assigned to the correct department with a priority and deadline, so that accountability is clear and urgent issues are addressed first.

#### Acceptance Criteria

1. WHEN an Issue Status becomes VERIFIED, THE Routing_Agent SHALL within 5 seconds map the Issue_Type to exactly one responsible Department.
2. WHEN the Routing_Agent assigns a Department, THE Routing_Agent SHALL compute a Priority_Score equal to Severity (an integer from 1 to 5) multiplied by community_votes (an integer from 0 to 1,000,000) multiplied by the time_elapsed_factor (a value from 1.0 to 10.0).
3. WHEN the Routing_Agent computes the time_elapsed_factor, THE Routing_Agent SHALL derive it from the whole hours elapsed since Issue creation, starting at 1.0 at 0 hours and increasing to a maximum of 10.0 at or beyond 168 hours.
4. WHEN the Routing_Agent assigns a Department, THE Routing_Agent SHALL assign an SLA_Deadline equal to the current timestamp plus a fixed duration mapped to the Issue_Type category, where the duration is an integer number of hours between 1 and 720.
5. WHEN the Routing_Agent completes assignment of Department, Priority_Score, and SLA_Deadline, THE Routing_Agent SHALL set the Issue Status to ASSIGNED within 5 seconds of the VERIFIED event.
6. IF no Department mapping exists for an Issue_Type, THEN THE Routing_Agent SHALL assign the Issue to the configured default Department, set an unmapped_category indicator to true, and continue computing Priority_Score and SLA_Deadline as in criteria 2 through 4.
7. WHEN the Routing_Agent assigns a Department and Priority_Score, THE Routing_Agent SHALL record a Reasoning_Explanation that states the Issue_Type, the selected Department, the Severity, community_votes, and time_elapsed_factor values used, and the resulting Priority_Score.
8. WHEN an Official views an Issue with Status ASSIGNED, THE Routing_Agent SHALL make the recorded Reasoning_Explanation available for display to the Official.

### Requirement 4: Resolution Agent

**User Story:** As a Citizen and as an Official, I want assigned issues monitored against their deadlines with proof of fix, so that resolutions are verified and overdue issues are escalated.

#### Acceptance Criteria

1. WHILE an Issue Status is ASSIGNED or IN_PROGRESS, THE Resolution_Agent SHALL evaluate the Issue against its SLA_Deadline at least once every 60 minutes.
2. IF an Issue passes its SLA_Deadline without reaching RESOLVED, THEN THE Resolution_Agent SHALL send a reminder to the responsible Department via the configured webhook within 5 minutes of the deadline being passed.
3. IF the configured webhook does not acknowledge a reminder, THEN THE Resolution_Agent SHALL retry sending the reminder up to 3 times at intervals of at least 5 minutes and SHALL record each delivery failure.
4. WHEN a Department reports a fix, THE Resolution_Agent SHALL require photo proof of the fix and SHALL keep the Issue Status unchanged until photo proof is received and accepted.
5. WHEN photo proof of a fix is received and validated as a readable image file no larger than 10 MB, THE Resolution_Agent SHALL set the Issue Status to RESOLVED.
6. IF submitted photo proof is missing, exceeds 10 MB, or fails image validation, THEN THE Resolution_Agent SHALL reject the fix report, keep the Issue Status unchanged, and return an indication describing the rejection reason.
7. WHEN an Issue Status becomes RESOLVED, THE Resolution_Agent SHALL award 50 XP and any earned Badge to the reporting Citizen.
8. WHEN the Resolution_Agent sends a reminder or changes an Issue Status, THE Resolution_Agent SHALL record and display to the user a Reasoning_Explanation that includes the SLA_Deadline and the elapsed time since the Issue was assigned.

### Requirement 5: Insights Agent

**User Story:** As an Official, I want a nightly analysis that predicts recurring issues and visualizes hotspots, so that the city can act proactively rather than reactively.

#### Acceptance Criteria

1. WHEN the scheduled nightly run time triggers, THE Insights_Agent SHALL cluster recurring Issues, where recurring means three or more Issues of the same Issue_Type within a Zone over the trailing 90 days, grouped by Zone and Issue_Type.
2. WHEN clustering completes, THE Insights_Agent SHALL generate a predictive heatmap that estimates the likelihood of future Issues per Zone as a value between 0.0 and 1.0, using historical data and contextual factors including rainfall and road age.
3. WHEN the Insights_Agent generates a prediction, THE Insights_Agent SHALL record a Reasoning_Explanation, available for display to the Official, that lists each contributing factor and the estimated likelihood value.
4. WHEN the predictive heatmap is generated, THE Insights_Agent SHALL publish the heatmap to the Impact_Dashboard within 60 minutes of clustering completion.
5. IF a Zone has fewer than 3 Issues or less than 30 days of historical data, THEN THE Insights_Agent SHALL mark that Zone prediction as low_confidence.
6. IF one or more contextual factors are unavailable for a Zone, THEN THE Insights_Agent SHALL generate the prediction using the available factors, mark the Zone prediction as low_confidence, and record which factors were missing.
7. IF publishing the heatmap to the Impact_Dashboard fails, THEN THE Insights_Agent SHALL retry up to 3 times, retain the previously published heatmap, and record an error indication.

### Requirement 6: Pipeline Orchestration

**User Story:** As a platform operator, I want the five agents orchestrated as a reliable multi-agent workflow, so that issues flow predictably from intake to insight.

#### Acceptance Criteria

1. WHEN a new report is submitted, THE Pipeline SHALL execute the Intake_Agent, Validation_Agent, Routing_Agent, and Resolution_Agent in that exact order, advancing to the next agent only after the current agent completes successfully.
2. IF an agent in the Pipeline fails, THEN THE Pipeline SHALL retry the failing agent up to 3 attempts before treating the failure as final.
3. IF an agent in the Pipeline fails after 3 retry attempts, THEN THE Pipeline SHALL retain the Issue at its last successful Status, record the failing agent identifier and an error indication describing the failure cause, and halt further sequence execution for that Issue.
4. WHILE an Issue progresses through the Pipeline, THE Pipeline SHALL persist the Status and Reasoning_Explanation produced at each stage before the next agent begins.
5. WHEN the scheduled nightly batch window begins between 00:00 and 04:00 local server time, THE Pipeline SHALL execute the Insights_Agent independently of any in-progress per-report sequence.
6. IF the Insights_Agent fails during the nightly batch, THEN THE Pipeline SHALL record an error indication identifying the failure cause and SHALL NOT alter the Status of any Issue in the per-report sequence.

### Requirement 7: Smart Issue Reporting

**User Story:** As a Citizen, I want to capture and report an issue quickly with my camera, location, and voice, so that I can report problems in the field with minimal effort.

#### Acceptance Criteria

1. WHEN a Citizen opens the report screen, THE Mobile_App SHALL provide camera capture for photo and for video of up to 60 seconds.
2. WHILE the camera is active, THE Mobile_App SHALL display a live overlay showing the Vision_Service suggested Issue_Type and Severity, updating the overlay within 2 seconds of a detected change.
3. WHEN a Citizen captures media, THE Mobile_App SHALL auto-populate Issue_Type, Severity, and suggested Department from the Intake_Agent analysis within 3 seconds.
4. WHEN a Citizen opens the report screen, THE Mobile_App SHALL auto-fill the report location from device GPS within 5 seconds.
5. IF device GPS is unavailable or does not return a location within 5 seconds, THEN THE Mobile_App SHALL prompt the Citizen to set the location manually via map pin drop and SHALL retain any entered report data.
6. WHERE a Citizen chooses to adjust the location, THE Mobile_App SHALL allow a manual pin drop on a map.
7. WHERE a Citizen chooses voice input, THE Mobile_App SHALL convert spoken description to text using the Web Speech API.
8. IF the Web Speech API is unsupported or voice conversion fails, THEN THE Mobile_App SHALL allow the Citizen to enter the description as text and SHALL retain any text already entered.
9. IF the device has no internet connection when a Citizen submits a report, THEN THE Mobile_App SHALL store the report in the Offline_Queue, confirm the report is queued, and submit it automatically when connectivity is restored.
10. WHEN a Citizen submits a report, THE Mobile_App SHALL display the suggested categorization and its Reasoning_Explanation before final submission.
11. WHEN a Citizen submits a report over a 4G connection, THE Mobile_App SHALL complete submission within 3 seconds.

### Requirement 8: Community Validation

**User Story:** As a Citizen, I want to be notified of nearby issues and vote on them with evidence, so that genuine community problems are verified and prioritized.

#### Acceptance Criteria

1. WHEN an Issue is reported, THE Notification_Service SHALL send a push notification, within 60 seconds, to each Citizen whose last known location is within 300 meters of the Issue location.
2. IF a push notification to a Citizen fails to send, THEN THE Notification_Service SHALL retry up to 3 times and, if all retries fail, record the notification as failed for that Citizen.
3. WHEN a Validator views an Issue, THE Mobile_App SHALL display an upvote action and a downvote action, each selectable exactly once per Validator per Issue.
4. WHERE a Validator adds photo evidence to a vote, THE Mobile_App SHALL attach up to 3 photos to the Issue, each no larger than 10 MB.
5. IF a Validator attempts to attach a photo that exceeds 10 MB or exceeds the limit of 3 photos per vote, THEN THE Mobile_App SHALL reject the photo, display an error message indicating the photo is invalid, and leave the previously attached photos unchanged.
6. WHEN an Issue reaches 10 upvotes, THE Platform SHALL set the Issue Status to VERIFIED and forward the Issue to the Routing_Agent.
7. WHEN a Validator's upvote is recorded on an Issue, THE Platform SHALL award 5 XP to the reporting Citizen for that upvote.
8. THE Platform SHALL count each Citizen's vote on a given Issue at most once.
9. IF a Citizen who has already voted on an Issue submits another vote on the same Issue, THEN THE Platform SHALL reject the additional vote and retain the Citizen's original vote.

### Requirement 9: Real-Time Issue Tracking

**User Story:** As a Citizen, I want to see live status updates for issues, so that I can trust that reports are being acted upon.

#### Acceptance Criteria

1. THE Platform SHALL represent Issue lifecycle as the ordered states REPORTED, VERIFIED, ASSIGNED, IN_PROGRESS, and RESOLVED, and SHALL permit Status transitions only in that forward order.
2. WHEN an Issue Status changes, THE Platform SHALL push the updated Status to all subscribed clients over WebSocket within 2 seconds of the change.
3. WHEN an Issue is displayed, THE Mobile_App SHALL render each Issue as a Google Maps pin whose color maps one-to-one to its current Status state, such that each of the five states has a distinct color.
4. WHEN an Issue is displayed, THE Mobile_App SHALL show the machine-learning estimated resolution time expressed in hours.
5. IF the machine-learning estimated resolution time is unavailable for an Issue, THEN THE Mobile_App SHALL display an indication that no estimate is available instead of a numeric value.
6. WHEN a Citizen opens an Issue detail view, THE Mobile_App SHALL display the full Status history in chronological order, each entry labeled with its date and time.
7. IF a subscribed client's WebSocket connection is lost, THEN THE Mobile_App SHALL re-establish the subscription and retrieve the current Issue Status upon reconnection.

### Requirement 10: 3D City Impact Dashboard

**User Story:** As a Citizen or Official, I want a visual 3D map of all active issues, so that I can understand community problems at a glance.

#### Acceptance Criteria

1. WHEN a user opens the Impact_Dashboard, THE Impact_Dashboard SHALL render a 3D city map using Three.js displaying all active Issues (up to a maximum of 5,000 Issue pins) within 5 seconds of page load.
2. THE Impact_Dashboard SHALL color-code each Issue pin as red for Issues with critical Status, amber for Issues with moderate Status, and green for Issues with resolved Status.
3. WHERE the heatmap overlay is enabled by the user, THE Impact_Dashboard SHALL display a density overlay in which color intensity increases with the count of Issues within each map region.
4. WHEN a new Issue is reported, THE Impact_Dashboard SHALL display an animated pulse at the Issue location within 3 seconds of the report being received, with the pulse animation repeating for a duration of 10 seconds.
5. WHERE a user applies a filter for time, category, Status, or Zone, THE Impact_Dashboard SHALL display only Issues matching all selected filter values.
6. IF a user applies a filter that matches zero Issues, THEN THE Impact_Dashboard SHALL display a message indicating that no Issues match the selected filter and SHALL render the map with no Issue pins.
7. IF the 3D city map fails to render because the browser does not support WebGL, THEN THE Impact_Dashboard SHALL display an error message indicating that 3D rendering is unavailable and SHALL present a non-3D fallback list of active Issues.

### Requirement 11: Gamification Engine

**User Story:** As a Citizen, I want to earn points, badges, and rankings for participating, so that contributing to my community is rewarding.

#### Acceptance Criteria

1. WHEN a Citizen submits a Report that passes intake validation, THE Platform SHALL award exactly 10 XP to that Citizen one time for that Report.
2. WHEN a Citizen validates an Issue that the Citizen did not report and has not previously validated, THE Platform SHALL award exactly 5 XP to that Citizen one time for that Issue.
3. WHEN an Issue reported by a Citizen transitions to the RESOLVED state, THE Platform SHALL award exactly 50 XP to that Citizen one time for that Issue.
4. IF a Report or Issue that previously triggered an XP award is later deleted or marked invalid, THEN THE Platform SHALL deduct the previously awarded XP for that Report or Issue, and THE Platform SHALL NOT allow a Citizen's total XP to fall below 0.
5. WHEN a Citizen accumulates 5 or more RESOLVED Issues in a single category, THE Platform SHALL award the corresponding category Badge to that Citizen at most once, where the categories map as follows: pothole Issues to Pothole Hunter, water-supply Issues to Water Guardian, and street-light Issues to Street Light Hero.
6. WHEN a Citizen's total XP changes, THE Platform SHALL recompute and update that Citizen's locality Leaderboard ranking within 5 seconds, ranking Citizens in descending order of XP.
7. IF two or more Citizens in the same locality have equal XP, THEN THE Platform SHALL rank the Citizen who reached that XP total earliest ahead of the others.
8. WHEN a calendar month ends, THE Platform SHALL award the Community Hero recognition for that month to the single highest-ranked Citizen in each locality, applying the tie-break rule in criterion 7 to resolve equal XP totals.

### Requirement 12: Predictive Insights

**User Story:** As an Official, I want data-driven predictions and reports, so that I can plan maintenance and keep municipal records.

#### Acceptance Criteria

1. WHEN the Insights_Agent analyzes a Zone, THE Platform SHALL generate a likelihood prediction for future Issues over the next 30 days, expressed as a probability value between 0 and 100 percent, using rainfall, infrastructure age, and traffic data as input factors.
2. IF one or more of the required input factors (rainfall, infrastructure age, or traffic data) is unavailable for a Zone, THEN THE Platform SHALL omit the prediction for that Zone and display an indication identifying which input factors are missing.
3. WHEN a Zone prediction probability is greater than or equal to the configured proactive-alert threshold (a value between 0 and 100 percent, default 70 percent), THE Platform SHALL send a proactive alert to the responsible Department within 60 seconds of the prediction being generated.
4. IF a proactive alert fails to be delivered to the responsible Department, THEN THE Platform SHALL retry delivery up to 3 times and, if all attempts fail, record the delivery failure and surface an indication that the alert was not delivered.
5. WHEN a calendar month ends, THE Platform SHALL auto-generate, within 24 hours of the month boundary, a PDF report of Issue activity for that month suitable for municipal records.
6. IF the monthly PDF report generation fails, THEN THE Platform SHALL retain the underlying Issue activity data, record the failure, and surface an indication that the report was not generated.
7. WHEN a prediction is displayed, THE Platform SHALL include the Reasoning_Explanation describing each contributing factor and its relative influence on the predicted probability.

### Requirement 13: Official Impact Dashboard

**User Story:** As an Official, I want aggregate metrics and exportable analytics, so that I can monitor department performance and citizen engagement.

#### Acceptance Criteria

1. WHEN an Official opens the dashboard, THE Web_Dashboard SHALL display, for the selected reporting period (default: trailing 30 days), the total count of Issues reported, the total count of Issues resolved, and the average resolution time expressed in hours rounded to one decimal place.
2. WHEN an Official opens the dashboard, THE Web_Dashboard SHALL display, for each department, the SLA compliance rate as a percentage from 0% to 100% (rounded to one decimal place), calculated as the count of Issues resolved within the department SLA divided by the total count of resolved Issues for that department.
3. WHEN an Official opens the dashboard, THE Web_Dashboard SHALL display a Zone heatmap in which each Zone is shaded by its Issue volume for the selected reporting period, with a trend indicator showing an upward arrow when the volume increased, a downward arrow when it decreased, and a neutral indicator when unchanged, relative to the immediately preceding period of equal length.
4. WHEN an Official opens the dashboard, THE Web_Dashboard SHALL display citizen engagement metrics consisting of the count of unique citizens who reported at least one Issue, the count of citizen comments, and the count of citizen upvotes, each scoped to the selected reporting period.
5. WHERE an Official requests an export, THE Web_Dashboard SHALL export the currently selected metrics for the selected reporting period to the Official-selected format (CSV or Google Sheets) and SHALL complete the export within 10 seconds for up to 100,000 data rows.
6. IF an export fails to complete or exceeds the 10-second limit, THEN THE Web_Dashboard SHALL retain the displayed metrics unchanged and SHALL present an error indication that the export did not complete and may be retried.
7. IF no Issue data exists for the selected reporting period, THEN THE Web_Dashboard SHALL display each affected metric as zero and SHALL present an indication that no data is available for the selected period.

### Requirement 14: Authentication and Identity

**User Story:** As a Citizen, I want to sign in securely while keeping my reports pseudonymous, so that I can participate without exposing personal information.

#### Acceptance Criteria

1. WHEN a Citizen or Official signs in with valid credentials, THE Auth_Service SHALL establish an authenticated session within 5 seconds and grant access scoped to that account type before allowing reporting or dashboard features.
2. THE Platform SHALL associate each Issue with a pseudonymous Citizen identifier and SHALL NOT expose the reporting Citizen's name, email address, or phone number on the Issue.
3. WHERE a feature requires Official privileges, THE Platform SHALL restrict access to authenticated Official accounts and SHALL deny access to Citizen accounts.
4. IF an unauthenticated request targets a protected feature, THEN THE Platform SHALL deny the request, withhold protected data, and prompt for authentication.
5. IF sign-in is attempted with invalid credentials, THEN THE Auth_Service SHALL deny the sign-in and return an indication that the credentials are invalid.
6. IF 5 consecutive failed sign-in attempts occur for an account, THEN THE Auth_Service SHALL lock further sign-in attempts for that account for 15 minutes.
7. WHILE an authenticated session has been idle for 30 minutes, THE Auth_Service SHALL end the session and require re-authentication before further access.

### Requirement 15: Offline-First Support

**User Story:** As a Citizen, I want the app to work without internet and sync later, so that I can report issues anywhere regardless of connectivity.

#### Acceptance Criteria

1. WHILE the device has no internet connection, THE Mobile_App SHALL allow a Citizen to capture media, fill the report form, and queue the report in the Offline_Queue, retaining all queued data in local storage across app restarts.
2. WHILE the device has no internet connection AND the Offline_Queue has reached its maximum capacity of 50 reports, THE Mobile_App SHALL prevent queuing of additional reports and display a message indicating the offline queue is full.
3. WHEN internet connectivity is restored, THE Sync_Service SHALL begin submitting queued reports from the Offline_Queue to the Platform within 10 seconds, in the order the reports were queued (oldest first).
4. WHEN a queued report is successfully synced, THE Mobile_App SHALL remove the report from the Offline_Queue and display its assigned Status within 5 seconds of receiving confirmation from the Platform.
5. IF a queued report fails to sync, THEN THE Sync_Service SHALL retain the report in the Offline_Queue, preserve all its data including media, and retry submission on the next connectivity event, up to a maximum of 5 retry attempts per report.
6. IF a queued report fails to sync after 5 retry attempts, THEN THE Sync_Service SHALL retain the report in the Offline_Queue and display a message indicating the report could not be submitted and requires manual resubmission.
7. THE Mobile_App SHALL be installable and runnable as a PWA without requiring an app-store installation.

### Requirement 16: AI Transparency

**User Story:** As a Citizen, I want to see why the AI made each decision, so that I can trust and verify the platform's categorizations.

#### Acceptance Criteria

1. WHEN the Platform presents an AI-generated categorization, THE Platform SHALL display, in the same view as the categorization, the accompanying Reasoning_Explanation containing at minimum the resulting decision outcome and the primary input factors that influenced the decision.
2. WHEN the Platform presents an AI-generated escalation, routing, or prediction decision, THE Platform SHALL display, in the same view as the decision, the accompanying Reasoning_Explanation containing at minimum the resulting decision outcome and the primary input factors that influenced the decision.
3. THE Platform SHALL store the Reasoning_Explanation for each AI decision alongside the affected Issue for a retention period of at least 365 days.
4. IF the Reasoning_Explanation for a presented AI decision is unavailable or cannot be retrieved, THEN THE Platform SHALL display a message indicating that the reasoning is unavailable, AND THE Platform SHALL continue to present the affected decision unchanged.
5. WHEN a Citizen views an Issue that has undergone auto-escalation, THE Platform SHALL display the auto-escalation log containing each escalation event with its trigger condition and the associated Reasoning_Explanation.

### Requirement 17: Accessibility

**User Story:** As a Citizen with accessibility needs, I want the app to be usable with voice and accessible controls, so that I can report issues regardless of ability.

#### Acceptance Criteria

1. WHEN the Citizen activates voice input for the Issue description field, THE Mobile_App SHALL transcribe captured spoken audio into editable text within the Issue description field.
2. THE Mobile_App SHALL render all interactive tap targets at a minimum size of 44 by 44 CSS pixels.
3. THE Mobile_App SHALL render normal text at a minimum contrast ratio of 4.5:1, and large text (at least 18pt, or 14pt bold) and interactive UI component boundaries at a minimum contrast ratio of 3:1 against their adjacent background, consistent with WCAG 2.1 Level AA.
4. IF voice recognition returns no recognizable speech or fails to produce transcribed text within 10 seconds of audio capture ending, THEN THE Mobile_App SHALL display an error message indicating that voice input was unsuccessful and SHALL retain any existing text in the Issue description field.
5. WHERE high contrast mode is enabled, THE Mobile_App SHALL render text and interactive elements at a minimum contrast ratio of 7:1 against their adjacent background.

### Requirement 18: Performance and API Efficiency

**User Story:** As a Citizen, I want fast report submission and a responsive app, so that reporting is quick even on mobile networks.

#### Acceptance Criteria

1. WHEN a Citizen submits a report over a 4G connection, THE Mobile_App SHALL complete submission and display a success confirmation within 3 seconds, measured from submit action to confirmation display.
2. IF report submission does not complete within 3 seconds, THEN THE Mobile_App SHALL retain the entered report data and display an error indication that submission is delayed, allowing the Citizen to retry without re-entering data.
3. THE Platform SHALL apply rate limiting to all external Google API calls, restricting requests to a maximum of 100 calls per minute per API key.
4. IF the configured rate limit of 100 calls per minute is reached, THEN THE Platform SHALL queue subsequent external Google API calls and process them when capacity is available, without dropping any request.
5. WHEN an external Google API result exists in the Redis cache and is less than 3600 seconds old, THE Platform SHALL serve the result from the Redis cache rather than issuing a duplicate external API call.
6. WHEN a requested external Google API result is absent from the Redis cache or is 3600 seconds or older, THE Platform SHALL issue the external API call and store the result in the Redis cache with a 3600-second expiry.

### Requirement 19: Data Privacy

**User Story:** As a Citizen, I want my personal data minimized, so that my privacy is protected while I participate.

#### Acceptance Criteria

1. THE Platform SHALL store personal data limited to the data fields defined for reporting, validation, and notification features, and SHALL reject storage of any personal data field not defined for those features.
2. THE Platform SHALL store Issue reports as pseudonymous records that display only a system-generated pseudonymous identifier and SHALL NOT expose the reporter's name, email address, phone number, or precise account identity to other Citizens.
3. WHEN personal data exceeds its defined retention period of 365 days after the associated Issue report reaches a closed state, THE Platform SHALL delete or irreversibly anonymize that personal data.
4. IF a Citizen submits a request to delete their personal data, THEN THE Platform SHALL remove or irreversibly anonymize all personal data linked to that Citizen within 30 days, retain the pseudonymous Issue report records, and return a confirmation indicating the deletion completed.
5. IF an attempt is made to access a reporter's personal identity from a Citizen-facing interface, THEN THE Platform SHALL deny the access and return an error indicating the data is not available.

### Requirement 20: Mobile Navigation and Screens

**User Story:** As a Citizen, I want clear screens for the key tasks, so that I can navigate reporting, tracking, profile, and rankings easily.

#### Acceptance Criteria

1. WHEN a Citizen launches the Mobile_App for the first time, THE Mobile_App SHALL display a splash screen with the 3D globe introduction for no longer than 3 seconds, then present an onboarding sequence of no more than 5 screens.
2. WHILE the onboarding sequence is displayed, THE Mobile_App SHALL provide a control to skip to the Home Feed and SHALL NOT display the onboarding sequence on subsequent launches.
3. WHEN a Citizen opens the Home Feed, THE Mobile_App SHALL display Issues located within a 5 km radius of the Citizen's current location and a pulse map that refreshes Issue markers at least once every 30 seconds.
4. WHEN a Citizen starts the Report Issue flow, THE Mobile_App SHALL present the steps in the fixed order of camera capture, AI analysis, form entry, then submit, advancing only after the current step completes.
5. IF AI analysis does not complete within 15 seconds or returns a failure, THEN THE Mobile_App SHALL display an indication that analysis was unsuccessful, retain the captured image and entered data, and allow the Citizen to continue to the form step manually.
6. WHEN a Citizen opens an Issue Detail screen, THE Mobile_App SHALL display the Status tracker, the current vote count, and the list of comments for that Issue.
7. WHEN a Citizen opens the Profile screen, THE Mobile_App SHALL display the Citizen's current XP total, earned Badges, and chronological report history.
8. WHEN a Citizen opens the Leaderboard screen, THE Mobile_App SHALL display the Zone ranking and the highlighted Community Hero, where the Community Hero is the top-ranked Citizen in the Zone.
9. WHEN a Citizen opens the Notification Center, THE Mobile_App SHALL display alerts in reverse chronological order, with each new alert appearing within 5 seconds of the triggering event.

### Requirement 21: Demonstration Scenario

**User Story:** As a hackathon judge, I want to run the full reporting-to-resolution flow on my phone browser, so that I can evaluate the platform live in Serilingampalle, Hyderabad.

#### Acceptance Criteria

1. WHEN a judge opens the Platform URL in a phone browser, THE Mobile_App SHALL load as a PWA and become interactive within 5 seconds on a 4G connection, without requiring app store download or device installation.
2. WHEN a judge submits a pothole report in the Serilingampalle, Hyderabad Zone, THE Pipeline SHALL produce, within 10 seconds, an Issue_Object populated with Issue_Type, Severity, a single suggested Department, and a non-empty Reasoning_Explanation.
3. IF the Pipeline fails to produce an Issue_Object within 10 seconds of report submission, THEN THE Mobile_App SHALL display an error message indicating the report could not be processed and SHALL retain the submitted report data for retry.
4. WHEN the demo Issue accumulates exactly 10 upvotes, THE Platform SHALL transition the Issue Status to VERIFIED, route the Issue to the suggested responsible Department, and assign an SLA_Deadline computed as a fixed duration from the verification timestamp.
5. WHEN the demo Issue is marked resolved and at least one resolution photo is attached, THE Platform SHALL transition the Issue Status to RESOLVED and award the configured XP amount to the reporting Citizen.
6. WHEN a Citizen's accumulated metrics cross a Badge threshold upon issue resolution, THE Platform SHALL award the earned Badge to that reporting Citizen.
7. IF an Issue is marked resolved with no resolution photo attached, THEN THE Platform SHALL reject the resolution, retain the Issue Status unchanged, and display an error message indicating that photo proof is required.
8. WHEN the demo Issues are displayed on the Impact_Dashboard, THE Impact_Dashboard SHALL render, within 5 seconds, the Serilingampalle, Hyderabad Zone showing one color-coded pin per Issue (color determined by Issue Status) and a heatmap overlay reflecting Issue density.
