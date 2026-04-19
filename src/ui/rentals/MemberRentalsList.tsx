import * as React from "react";
import moment from "moment";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { Rental, listRentals, Member } from "makerspace-ts-api-client";

import StatefulTable from "ui/common/table/StatefulTable";
import { SortDirection } from "ui/common/table/constants";
import { Column } from "ui/common/table/Table";
import { Status } from "ui/constants";
import StatusLabel from "ui/common/StatusLabel";
import ErrorMessage from "ui/common/ErrorMessage";
import { timeToDate } from "ui/utils/timeToDate";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import { cancelRental } from "api/rentals";
import { RentalStatus, RentalStatusDisplay } from "app/entities/rentalSpot";
import { withQueryContext, useQueryContext } from "ui/common/Filters/QueryContext";
import extractTotalItems from "ui/utils/extractTotalItems";

const rowId = (rental: Rental) => rental.id;

const statusColor = (status: string): Status => {
  switch (status) {
    case RentalStatus.Active:    return Status.Success;
    case RentalStatus.Pending:   return Status.Warn;
    case RentalStatus.Cancelled: return Status.Default;
    case RentalStatus.Denied:    return Status.Danger;
    default:                     return Status.Default;
  }
};

const MemberRentalsList: React.FC<{ member: Member; onUpdate?: () => void }> = ({ member, onUpdate }) => {
  const [cancelTarget, setCancelTarget] = React.useState<Rental | null>(null);
  const { params, changePage } = useQueryContext();

  const { isRequesting, data: rentals = [], response, refresh, error } = useReadTransaction(
    listRentals, { ...params }, undefined, "member-rentals-list"
  );

  const onCancelSuccess = React.useCallback(() => {
    setCancelTarget(null);
    refresh();
    changePage(0);
    onUpdate && onUpdate();
  }, [refresh, changePage, onUpdate]);

  const { call: doCancel, isRequesting: cancelling, error: cancelError } = useWriteTransaction(
    cancelRental, onCancelSuccess
  );

  const columns: Column<Rental>[] = [
    {
      id: "number", label: "Spot",
      cell: (row: Rental) => row.number,
      defaultSortDirection: SortDirection.Asc,
    },
    {
      id: "description", label: "Description",
      cell: (row: Rental) => row.description || "—",
    },
    {
      id: "expiration", label: "Expiration",
      cell: (row: Rental) => row.expiration ? timeToDate(row.expiration) : "—",
      defaultSortDirection: SortDirection.Desc,
    },
    {
      id: "status", label: "Status",
      cell: (row: Rental) => {
        const status = (row as any).status;
        if (!status || status === RentalStatus.Active) {
          const expired = row.expiration && moment(row.expiration).valueOf() < Date.now();
          return <StatusLabel label={expired ? "Expired" : "Active"} color={expired ? Status.Danger : Status.Success} />;
        }
        return (
          <StatusLabel
            label={RentalStatusDisplay[status as RentalStatus] || status}
            color={statusColor(status)}
          />
        );
      },
    },
    {
      id: "actions", label: "",
      cell: (row: Rental) => {
        const status = (row as any).status;
        const cancellable = !status || status === RentalStatus.Active || status === RentalStatus.Pending;
        return cancellable ? (
          <Button size="small" variant="outlined" color="secondary"
            onClick={e => { e.stopPropagation(); setCancelTarget(row); }}
          >Cancel</Button>
        ) : null;
      },
    },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <StatefulTable
          id="member-rentals-table" title="My Rentals"
          loading={isRequesting} data={Object.values(rentals)} error={error}
          totalItems={extractTotalItems(response)} columns={columns}
          rowId={rowId} renderSearch={false}
        />
      </Grid>

      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <DialogTitle>Cancel Rental</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to cancel your rental of <strong>{cancelTarget && cancelTarget.number}</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Cancellation takes effect immediately. Any active Braintree subscription will be cancelled
            and any pending invoice will be voided.
          </Typography>
          <ErrorMessage error={cancelError} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep Rental</Button>
          <Button color="secondary" variant="contained" disabled={cancelling}
            onClick={() => cancelTarget && doCancel({ id: cancelTarget.id })}
          >
            {cancelling ? "Cancelling..." : "Yes, Cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default withQueryContext(MemberRentalsList);
