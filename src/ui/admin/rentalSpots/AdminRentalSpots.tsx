import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import MenuItem from "@material-ui/core/MenuItem";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import Chip from "@material-ui/core/Chip";
import Alert from "@material-ui/lab/Alert";

import { RentalSpot, RentalType, RentalTypeDisplay } from "app/entities/rentalSpot";
import StatefulTable from "ui/common/table/StatefulTable";
import { SortDirection } from "ui/common/table/constants";
import { Column } from "ui/common/table/Table";
import { Status } from "ui/constants";
import StatusLabel from "ui/common/StatusLabel";
import FormModal from "ui/common/FormModal";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import { adminListRentalSpots, adminCreateRentalSpot, adminUpdateRentalSpot, adminDeleteRentalSpot } from "api/rentals";
import { withQueryContext, useQueryContext } from "ui/common/Filters/QueryContext";
import extractTotalItems from "ui/utils/extractTotalItems";

const rowId = (spot: RentalSpot) => spot.id;

const emptySpot = (): Partial<RentalSpot> => ({
  number: "",
  location: "",
  description: "",
  rentalType: RentalType.Tote,
  requiresApproval: false,
  active: true,
  parentNumber: null,
  invoiceOptionId: null,
  notes: null,
});

const AdminRentalSpots: React.FC = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<RentalSpot | null>(null);
  const [editTarget, setEditTarget] = React.useState<Partial<RentalSpot>>(emptySpot());
  const [isEditing, setIsEditing] = React.useState(false);

  const { params, changePage } = useQueryContext();

  const { isRequesting, data: spots = [], response, refresh, error } = useReadTransaction(
    adminListRentalSpots,
    { ...params },
    undefined,
    "admin-rental-spots"
  );

  const onSaveSuccess = React.useCallback(() => {
    setModalOpen(false);
    setEditTarget(emptySpot());
    setIsEditing(false);
    refresh();
  }, [refresh]);

  const onDeleteSuccess = React.useCallback(() => {
    setDeleteTarget(null);
    refresh();
    changePage(0);
  }, [refresh, changePage]);

  const { call: createSpot, isRequesting: creating, error: createError } = useWriteTransaction(adminCreateRentalSpot, onSaveSuccess);
  const { call: updateSpot, isRequesting: updating, error: updateError } = useWriteTransaction(adminUpdateRentalSpot, onSaveSuccess);
  const { call: deleteSpot, isRequesting: deleting, error: deleteError } = useWriteTransaction(adminDeleteRentalSpot, onDeleteSuccess);

  const isSaving = creating || updating;

  const openCreate = () => {
    setEditTarget(emptySpot());
    setIsEditing(false);
    setModalOpen(true);
  };

  const openEdit = (spot: RentalSpot) => {
    setEditTarget({ ...spot });
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleSave = React.useCallback(() => {
    if (isEditing && editTarget.id) {
      updateSpot({ id: editTarget.id, body: editTarget as RentalSpot });
    } else {
      createSpot({ body: editTarget as RentalSpot });
    }
  }, [isEditing, editTarget, createSpot, updateSpot]);

  const setField = (field: keyof RentalSpot, value: any) => {
    setEditTarget(prev => ({ ...prev, [field]: value }));
  };

  const columns: Column<RentalSpot>[] = [
    {
      id: "number",
      label: "Number",
      cell: (row: RentalSpot) => (
        <span>
          {row.number}
          {row.parentNumber && (
            <Chip size="small" label={`child of ${row.parentNumber}`} style={{ marginLeft: "6px", fontSize: "10px" }} />
          )}
        </span>
      ),
      defaultSortDirection: SortDirection.Asc,
    },
    {
      id: "location",
      label: "Location",
      cell: (row: RentalSpot) => row.location,
    },
    {
      id: "rentalType",
      label: "Type",
      cell: (row: RentalSpot) => RentalTypeDisplay[row.rentalType] || row.rentalType,
    },
    {
      id: "invoiceOption",
      label: "Billing Plan",
      cell: (row: RentalSpot) => row.invoiceOptionName
        ? `${row.invoiceOptionName} ($${row.invoiceOptionAmount}/mo)`
        : <span style={{ color: "grey" }}>Not set</span>,
    },
    {
      id: "approval",
      label: "Approval",
      cell: (row: RentalSpot) => row.requiresApproval
        ? <StatusLabel label="Required" color={Status.Warn} />
        : <StatusLabel label="Auto" color={Status.Success} />,
    },
    {
      id: "available",
      label: "Available",
      cell: (row: RentalSpot) => row.available
        ? <StatusLabel label="Yes" color={Status.Success} />
        : <StatusLabel label="No" color={Status.Default} />,
    },
    {
      id: "active",
      label: "Active",
      cell: (row: RentalSpot) => row.active
        ? <StatusLabel label="Active" color={Status.Success} />
        : <StatusLabel label="Disabled" color={Status.Danger} />,
    },
    {
      id: "actions",
      label: "",
      cell: (row: RentalSpot) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button size="small" variant="outlined" onClick={e => { e.stopPropagation(); openEdit(row); }}>
            Edit
          </Button>
          <Button size="small" variant="outlined" color="secondary" onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Grid container justify="space-between" alignItems="center">
          <Typography variant="h6">Rental Spot Catalog</Typography>
          <Button variant="contained" color="primary" onClick={openCreate}>
            Add Spot
          </Button>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <StatefulTable
          id="admin-rental-spots-table"
          title="Rental Spots"
          loading={isRequesting}
          data={Object.values(spots)}
          error={error}
          totalItems={extractTotalItems(response)}
          columns={columns}
          rowId={rowId}
          renderSearch={true}
        />
      </Grid>

      {/* Create / Edit modal */}
      {modalOpen && (
        <FormModal
          id="rental-spot-form"
          isOpen={modalOpen}
          title={isEditing ? `Edit Spot — ${editTarget.number}` : "Add Rental Spot"}
          closeHandler={() => { setModalOpen(false); setEditTarget(emptySpot()); }}
          onSubmit={handleSave}
          submitText={isEditing ? "Save Changes" : "Create Spot"}
          loading={isSaving}
          error={createError || updateError}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth required
                label="Spot Number"
                placeholder="e.g. Shelf-1a, LR-Tote-1"
                value={editTarget.number || ""}
                onChange={e => setField("number", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth required
                label="Location"
                placeholder="e.g. Back Shop, Locker Room"
                value={editTarget.location || ""}
                onChange={e => setField("location", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select fullWidth required
                label="Rental Type"
                value={editTarget.rentalType || RentalType.Tote}
                onChange={e => setField("rentalType", e.target.value)}
              >
                {Object.values(RentalType).map(t => (
                  <MenuItem key={t} value={t}>{RentalTypeDisplay[t]}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Parent Spot Number"
                placeholder="Leave blank if not a sub-spot"
                value={editTarget.parentNumber || ""}
                onChange={e => setField("parentNumber", e.target.value || null)}
                helperText="Set this for half-shelf or sub-spots (e.g. parent is Shelf-1)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                placeholder="e.g. Full shelf, bottom row"
                value={editTarget.description || ""}
                onChange={e => setField("description", e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Invoice Option ID"
                placeholder="MongoDB ID of the InvoiceOption for billing"
                value={editTarget.invoiceOptionId || ""}
                onChange={e => setField("invoiceOptionId", e.target.value || null)}
                helperText="Find this in the Invoice Options admin screen"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={editTarget.notes || ""}
                onChange={e => setField("notes", e.target.value || null)}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!editTarget.requiresApproval}
                    onChange={e => setField("requiresApproval", e.target.checked)}
                    color="primary"
                  />
                }
                label="Requires Admin Approval"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editTarget.active !== false}
                    onChange={e => setField("active", e.target.checked)}
                    color="primary"
                  />
                }
                label="Active (visible to members)"
              />
            </Grid>
          </Grid>
        </FormModal>
      )}

      {/* Delete confirmation */}
      <FormModal
        id="delete-rental-spot"
        isOpen={!!deleteTarget}
        title="Delete Rental Spot"
        closeHandler={() => setDeleteTarget(null)}
        onSubmit={() => deleteTarget && deleteSpot({ id: deleteTarget.id })}
        submitText="Delete"
        loading={deleting}
        error={deleteError}
      >
        {deleteTarget && (
          <>
            <Typography gutterBottom>
              Are you sure you want to delete spot <strong>{deleteTarget.number}</strong>?
            </Typography>
            <Alert severity="warning">
              This only removes the spot from the catalog. Existing rentals linked to this spot are not affected.
            </Alert>
          </>
        )}
      </FormModal>
    </Grid>
  );
};

export default withQueryContext(AdminRentalSpots);
