/**
 * PATCH INSTRUCTIONS FOR src/ui/member/MemberDetail.tsx
 * ======================================================
 * 
 * Make these two changes to the existing MemberDetail.tsx file.
 * Do NOT replace the whole file — it has too much other logic.
 *
 * CHANGE 1 — Add import near the top (replace the RentalsList import):
 *
 *   // REMOVE:
 *   import RentalsList from "ui/rentals/RentalsList";
 *
 *   // ADD:
 *   import MemberRentalsTab from "ui/rentals/MemberRentalsTab";
 *
 *
 * CHANGE 2 — In the resources array, replace the rentals entry:
 *
 *   // REMOVE:
 *   {
 *     name: "rentals",
 *     content: <RentalsList member={member}/>
 *   },
 *
 *   // ADD:
 *   {
 *     name: "rentals",
 *     content: <MemberRentalsTab member={member} onUpdate={refreshMember} />
 *   },
 *
 *
 * NOTE: The existing `listRentals` import and the rental notification logic
 * (SignRental notification) at the top of the component should stay exactly
 * as-is — MemberRentalsTab uses listRentals internally and the notification
 * flow is unchanged.
 */
