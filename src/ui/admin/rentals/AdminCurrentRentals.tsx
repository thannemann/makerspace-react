import * as React from "react";
// This tab simply re-uses the existing RentalsList component in admin mode.
// No changes needed to RentalsList.tsx — it already shows admin controls
// (Create, Edit, Renew, Delete) when the current user canManage.
import RentalsList from "ui/rentals/RentalsList";

const AdminCurrentRentals: React.FC = () => <RentalsList />;

export default AdminCurrentRentals;
