import * as React from "react";
import Grid from "@material-ui/core/Grid";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Typography from "@material-ui/core/Typography";
import Tooltip from "@material-ui/core/Tooltip";
import { Link } from "react-router-dom";
import moment from "moment";
import { Rental, adminListRentals } from "makerspace-ts-api-client";

import StatefulTable from "ui/common/table/StatefulTable";
import { SortDirection } from "ui/common/table/constants";
import { Column } from "ui/common/table/Table";
import { Status } from "ui/constants";
import StatusLabel from "ui/common/StatusLabel";
import { timeToDate } from "ui/utils/timeToDate";
import useReadTransaction from "ui/hooks/useReadTransaction";
import extractTotalItems from "ui/utils/extractTotalItems";
import CreateRentalAdmin from "ui/rentals/CreateRentalAdmin";
import EditRental from "ui/rentals/EditRental";
import RenewRental from "ui/rentals/RenewRental";
import DeleteRentalModal from "ui/rentals/DeleteRentalModal";
import { useAuthState } from "ui/reducer/hooks";
import { RentalStatus } from "app/entities/rentalSpot";

const rowId = (rental: Rental) => rental.id;

const getRentalStatus = (row: Rental): { label: string; color: Status } => {
  const status = (row as any).status as RentalStatus;
  if (status && status !== RentalStatus.Active) {
    switch (status) {
      case RentalStatus.Pending:          return { label: "Pending Approval",   color: Status.Warn };
      case RentalStatus.PendingAgreement: return { label: "Pending Agreement",  color: Status.Warn };
      case RentalStatus.Vacating:         return { label: "Vacating",           color: Status.Warn };
      case RentalStatus.Cancelled:        return { label: "Cancelled",          color: Status.Default };
      case RentalStatus.Denied:           return { label: "Denied",             color: Status.Danger };
      case RentalStatus.AgreementDenied:  return { label: "Agreement Declined", color: Status.Danger };
    }
  }
  const expired = row.expiration && moment(row.expiration).valueOf() < Date.now();
  return { label: expired ? "Expired" : "Active", color: expired ? Status.Danger : Status.Success };
};

const AdminCurrentRentals: React.FC = () => {
  const { currentUser: { isAdmin } } = useAuthState();
  const [activeOnly, setActiveOnly] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string>();

  const { isRequesting, data: rentals = [], response, refresh, error } = useReadTransaction(
    adminListRentals,
    (activeOnly ? { status: "active" } : {}) as any,
    undefined,
    `admin-current-rentals-${activeOnly}`
  );

  const onAction = React.useCallback(() => {
    refresh();
    setSelectedId(null);
  }, [refresh]);

  const selectedRental = rentals.find(r => r.id === selectedId);

  const columns: Column<Rental>[] = [
    {
      id: "number", label: "Number",
      cell: (r: Rental) => r.number,
      defaultSortDirection: SortDirection.Desc,
    },
    {
      id: "description", label: "Description",
      cell: (r: Rental) => r.description,
    },
    {
      id: "expiration", label: "Expiration Date",
      cell: (r: Rental) => r.expiration ? timeToDate(r.expiration) : "N/A",
      defaultSortDirection: SortDirection.Desc,
    },
    {
      id: "member", label: "Member",
      cell: (r: Rental) => <Link to={`/members/${r.memberId}`}>{r.memberName}</Link>,
      width: 200,
    },
    {
      id: "status", label: "Status",
      cell: (r: Rental) => {
        const { label, color } = getRentalStatus(r);
        const status = (r as any).status as RentalStatus;
        if (status === RentalStatus.Denied || status === RentalStatus.AgreementDenied) {
          const notes = (r as any).notes || "";
          const match = notes.match(/(?:Denied|Agreement declined)[:\s]+(.+?)(\s*\|.*)?$/i);
          const reason = match ? match[1].trim() : "No reason provided";
          return (
            <Tooltip title={`Reason: ${reason}`} placement="top">
              <span><StatusLabel label={label} color={color} /></span>
            </Tooltip>
          );
        }
        return <StatusLabel label={label} color={color} />;
      },
    },
  ];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Grid container justify="space-between" alignItems="center">
          <Grid item>
            <FormControlLabel
              control={
                <Checkbox
                  id="admin-rentals-active-filter"
                  checked={activeOnly}
                  onChange={e => setActiveOnly(e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography variant="body2">Show active rentals only</Typography>}
            />
          </Grid>
          <Grid item>
            <CreateRentalAdmin onCreate={onAction} />
            <EditRental rental={selectedRental} onUpdate={onAction} />
            <RenewRental rental={selectedRental} onRenew={onAction} />
            {isAdmin && <DeleteRentalModal rental={selectedRental} onDelete={onAction} />}
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <StatefulTable
          id="rentals-table"
          title="Rentals"
          loading={isRequesting}
          data={Object.values(rentals)}
          error={error}
          totalItems={extractTotalItems(response)}
          selectedIds={selectedId}
          setSelectedIds={setSelectedId}
          columns={columns}
          rowId={rowId}
          renderSearch={true}
        />
      </Grid>
    </Grid>
  );
};

export default AdminCurrentRentals;
