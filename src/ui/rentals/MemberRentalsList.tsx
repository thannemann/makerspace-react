import * as React from "react";
import moment from "moment";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Tooltip from "@material-ui/core/Tooltip";
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
    case RentalStatus.Vacating:  return Status.Warn;
    case RentalStatus.Cancelled: return Status.Default;
    case RentalStatus.Denied:    return Status.Danger;
    default:                     return Status.Default;
  }
};

// Extract denial reason from notes field
const getDenialReason = (rental: Rental): string => {
  const notes = (rental as any).notes || "";
  const match = notes.match(/Denied: (.+?)(\s*\|.*)?$/);
  return match ? match[1].trim() : "Contact us for details.";
};

type CancelStep = "confirm" | "vacated";

const MemberRentalsList: React.FC<{ member: Member; onUpdate?: () => void }> = ({ member, onUpdate }) => {
  const [cancelTarget, setCancelTarget] = React.useState<Rental | null>(null);
  const [cancelStep,   setCancelStep]   = React.useState<CancelStep>("confirm");
  const [selectedId,   setSelectedId]   = React.useState<string>(undefined);
  const { params, changePage } = useQueryContext();

  const { isRequesting, data: rentals = [], response, refresh, error } = useReadTransaction(
    listRentals, { ...params }, undefined, "member-rentals-list"
  );

  const openCancel = (rental: Rental) => {
    setCancelTarget(rental);
    setCancelStep("confirm");
  };

  const closeCancel = () => {
    setCancelTarget(null);
    setCancelStep("confirm");
  };

  const onCancelSuccess = React.useCallback(() => {
    closeCancel();
    refresh();
    changePage(0);
    onUpdate && onUpdate();
  }, [refresh, changePage, onUpdate]);

  const { call: doCancel, isRequesting: cancelling, error: cancelError } = useWriteTransaction(
    cancelRental, onCancelSuccess
  );

  const handleVacated = (vacated: boolean) => {
    if (cancelTarget) {
      doCancel({ id: cancelTarget.id, body: { vacated } });
    }
  };

  const columns: Column<Rental>[] = [
    {
      id: "number", label: "Rental",
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
        const status = (row as any).status as RentalStatus;

        // Legacy rentals without status field
        if (!status || status === RentalStatus.Active) {
          const expired = row.expiration && moment(row.expiration).valueOf() < Date.now();
          return <StatusLabel label={expired ? "Expired" : "Active"} color={expired ? Status.Danger : Status.Success} />;
        }

        // Denied — show with tooltip explaining reason
        if (status === RentalStatus.Denied) {
          const reason = getDenialReason(row);
          return (
            <Tooltip title={`Reason: ${reason}`} placement="top">
              <span>
                <StatusLabel label="Denied" color={Status.Danger} />
              </span>
            </Tooltip>
          );
        }

        return (
          <StatusLabel
            label={RentalStatusDisplay[status] || status}
            color={statusColor(status)}
          />
        );
      },
    },
    {
      id: "actions", label: "",
      cell: (row: Rental) => {
        const status = (row as any).status as RentalStatus;
        const cancellable = !status || status === RentalStatus.Active || status === RentalStatus.Pending;
        return cancellable ? (
          <Button size="small" variant="outlined" color="secondary"
            onClick={e => { e.stopPropagation(); openCancel(row); }}
          >Cancel</Button>
        ) : null;
      },
    },
  ];

  const expiryDisplay = cancelTarget?.expiration
    ? timeToDate(cancelTarget.expiration)
    : "the end of your current rental period";

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <StatefulTable
          id="member-rentals-table" title="My Rentals"
          loading={isRequesting} data={Object.values(rentals)} error={error}
          totalItems={extractTotalItems(response)}
          selectedIds={selectedId} setSelectedIds={setSelectedId}
          columns={columns} rowId={rowId} renderSearch={false}
        />
      </Grid>

      {/* Step 1 — Confirm cancellation intent */}
      <Dialog open={!!cancelTarget && cancelStep === "confirm"} onClose={closeCancel}>
        <DialogTitle>Cancel Rental</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to cancel your rental of <strong>{cancelTarget?.number}</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No further charges will be made after your current rental period ends.
          </Typography>
          <ErrorMessage error={cancelError} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancel}>Keep Rental</Button>
          <Button color="secondary" variant="contained" id="member-rental-cancel-confirm"
              onClick={() => setCancelStep("vacated")}>
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Step 2 — Have you vacated? */}
      <Dialog open={!!cancelTarget && cancelStep === "vacated"} onClose={closeCancel}>
        <DialogTitle>Have You Vacated Your Rental?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Have you already removed your belongings from rental <strong>{cancelTarget?.number}</strong>?
          </Typography>
          <Typography variant="body2" style={{ marginTop: "8px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <strong>Yes</strong> — Your rental will end immediately and the space will be available for other members.
          </Typography>
          <Typography variant="body2" style={{ marginTop: "8px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <strong>No</strong> — Your rental will remain active until <strong>{expiryDisplay}</strong>. Please ensure you have vacated by then.
          </Typography>
          <ErrorMessage error={cancelError} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancel} disabled={cancelling}>Back</Button>
          <Button variant="outlined" color="secondary" disabled={cancelling}
            id="member-rental-vacated-no"
            onClick={() => handleVacated(false)}
          >
            {cancelling ? "Processing..." : "No, Not Yet"}
          </Button>
          <Button variant="contained" color="secondary" disabled={cancelling}
            id="member-rental-vacated-yes"
            onClick={() => handleVacated(true)}
          >
            {cancelling ? "Processing..." : "Yes, I Have Vacated"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default withQueryContext(MemberRentalsList);
