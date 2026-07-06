Problem Statement


The Problem

Currently, most libraries rely on manual, paper-based systems to manage its inventory, borrow and return logs. This manual record-keeping system is inefficient, prone to errors, and lacks real-time visibility into book availability. The library management system “Keep”, will enforce role-based access control, track book inventory in real-time, automate overdue tracking, and strictly manage transactions to ensure a book cannot be borrowed if all physical copies are checked out.


User Personas

Persona 1: Librarian (Admin)
Name: Jane Dela Cruz
Role: Head University Librarian
Goals: Efficiently track book inventory, easily identify who has borrowed specific books, and generate weekly reports on overdue items without digging through paperwork.
Pain Points: Spends hours cross-referencing paper ledgers; cannot easily tell which student has an unreturned book; struggles to prevent students from walk-in borrowing when a book is technically reserved or out of stock.

Persona 2: Student (User)
Name: John Rivera
Role: 2nd Year Student
Goals: Quickly check if a book required for an assignment is available in the library and view their own borrowing history to see when books are due.
Pain Points: Walks to the library only to find out all copies of a book are checked out; forgets due dates because there are no reminders.









User Stories & Acceptance Criteria

User Story 1: As a Librarian, I want to log into a secure portal so that I can access administrative features like report generation and complete inventory tracking.

Acceptance Criteria:
The login interface must accept a unique username/email and password.
Upon successful authentication with Librarian credentials, the user must be routed to the Librarian Dashboard.
The system must grant exclusive access to administrative controls (e.g., viewing all student histories, processing checkouts, generating reports) while blocking non-librarian users.

User Story 2: As a Student, I want to log into my personal account so that I can view my current borrowings and search the catalog.

Acceptance Criteria:
The login interface must accept a unique student ID and password.
Upon successful authentication with Student credentials, the user must be routed to the Student Dashboard.
The system must restrict the student's view to their own personal borrowing records and prevent access to administrative functionalities.


User Story 3: As a User (Librarian/Student), I want to view a real-time catalog of books with their availability status so that I know what is currently on the shelves.

Acceptance Criteria:
The catalog must display key book details: Title, Author, ISBN, Total Copies, and Available Copies.
The inventory count must update dynamically. If Available Copies == 0, the status must change to "Out of Stock" or "Unavailable".
Users must be able to search or filter the catalog by title, author, or availability.


User Story 4: As a Librarian, I want to process a returned book so that it is marked as available for the next user.

Acceptance Criteria:
The system must allow the librarian to look up active loans by student ID or book details to initiate a return.
Upon saving the return, the system must increment the book's Available Copies by 1.
The loan record status must update from "Active" to "Returned", and the current timestamp must be recorded as the "Date Returned".



User Story 5: As a Student, I want to view my past and current borrowed books so that I can track my reading habits and monitor due dates.

Acceptance Criteria:
The history view must clearly separate "Active Loans" (currently borrowed) from "Past Loans" (returned books).
For active loans, the display must prominently highlight the "Due Date".
The list must sort dynamically, showing the most recent transactions at the top.



User Story 6: As a Librarian, I want the system to flag books that have passed their due dates so that I can maintain accountability.

Acceptance Criteria:
The system must evaluate active loans against the current date; if Current Date > Due Date and the book has not been returned, the loan status must automatically switch to "Overdue".
The Librarian Dashboard must feature an "Overdue Items" view that lists all unreturned books past their due dates along with the corresponding student details.


User Story 7: As a Student, I want to receive a notification (or dashboard alert) when a book is overdue so that I remember to return it promptly.

Acceptance Criteria:
As soon as a student's active loan is flagged as "Overdue", a high-visibility warning alert must render directly on their Student Dashboard upon login.
The alert must specify the title of the overdue book and the number of days it is past due.


User Story 8: As a Librarian, I want to generate a summary report of library activity (total books checked out, current overdues) so that I can share it with school administration.

Acceptance Criteria:
The system must provide a dedicated Reports dashboard accessible only by Librarians.
The report must synthesize aggregate live metrics: Total Books in Inventory, Total Active Checkouts, and Total Overdue Books.
The report must render a clean, tabular layout summarizing which students currently hold overdue materials.
