import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Select from "@material-ui/core/Select";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import FormLabel from "@material-ui/core/FormLabel";
import { Link } from "react-router-dom";
import { InvoiceOption, listInvoiceOptions, InvoiceableResource } from "makerspace-ts-api-client";

import { RentalType } from "app/entities/rentalSpot";
import StatefulTable from "ui/common/table/StatefulTable";
import { SortDirection } from "ui/common/table/constants";
import { Column } from "ui/common/table/Table";
import { Status } from "ui/constants";
import StatusLabel from "ui/common/StatusLabel";
import ErrorMessage from "ui/common/ErrorMessage";
import FormModal from "ui/common/FormModal";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import {
  adminListRentalTypes, adminCreateRentalType,
  adminUpdateRentalType, adminDeleteRentalType,
} from "api/rentals";
import { Routing } from "app/constants";
import { withQueryContext, useQueryContext } from "ui/common/Filters/QueryContext";
import extractTotalItems from "ui/utils/extractTotalItems";
import { numberAsCurrency } from "ui/utils/numberAsCurrency";

const rowId = (t: RentalType) => t.id;
const emptyType = (): Partial<RentalType> => ({ displayName: "", active: true, invoiceOptionId: null });

const warningBoxStyle: React.CSSProperties = {
  padding: "8px", backgroundColor: "#fff3e0",
  borderRadius: "4px", border: "1px solid #ffcc02", marginTop: "8px"
};

const AdminRentalTypes: React.FC = () => {
  const [modalOpen,    setModalOpen]    = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<RentalType | null>(null);
  const [editTarget,   setEditTarget]   = React.useState<Partial<RentalType>>(emptyType());
  const [isEditing,    setIsEditing]    = React.useState(false);
  const [selectedId,   setSelectedId]   = React.useState<string>(undefined);
  const { params, changePage } = useQueryContext();

  // Load rental invoice options for the dropdown using existing listInvoiceOptions
  const { data: invoiceOptions = [] } = useReadTransaction(
    listInvoiceOptions,
    { types: [InvoiceableResource.Rental] },
    undefined,
    "rental-invoice-options-for-types"
  );

  const { isRequesting, data: rentalTypes = [], response, refresh, error } = useReadTransaction(
    adminListRentalTypes, { ...params }, undefined, "admin-rental-types"
  );

  const onSaveSuccess = React.useCallback(() => {
    setModalOpen(false); setEditTarget(emptyType()); setIsEditing(false); refresh();
  }, [refresh]);

  const onDeleteSuccess = React.useCallback(() => {
    setDeleteTarget(null); refresh(); changePage(0);
  }, [refresh, changePage]);

  const { call: createType, isRequesting: creating, error: createError } = useWriteTransaction(adminCreateRentalType, onSaveSuccess);
  const { call: updateType, isRequesting: updating, error: updateError } = useWriteTransaction(adminUpdateRentalType, onSaveSuccess);
  const { call: deleteType, isRequesting: deleting, error: deleteError } = useWriteTransaction(adminDeleteRentalType, onDeleteSuccess);
  const isSaving = creating || updating;

  const openCreate = () => { setEditTarget(emptyType()); setIsEditing(false); setModalOpen(true); };
  const openEdit = (t: RentalType) => { setEditTarget({ ...t }); setIsEditing(true); setModalOpen(true); };
  const setField = (field: keyof RentalType, value: any) => setEditTarget(prev => ({ ...prev, [field]: value }));

  const handleSave = React.useCallback(() => {
    if (isEditing && editTarget.id) {
      updateType({ id: editTarget.id, body: editTarget as RentalType });
    } else {
      createType({ body: editTarget as RentalType });
    }
  }, [isEditing, editTarget, createType, updateType]);

  const billingPath = `${Routing.Billing}/options`;

  const columns: Column<RentalType>[] = [
    {
      id: "displayName", label: "Type Name",
      cell: (row: RentalType) => row.displayName,
      defaultSortDirection: SortDirection.Asc,
    },
    {
      id: "invoiceOption", label: "Billing Plan",
      cell: (row: RentalType) => {
        if (row.invoiceOptionName) {
          return `${row.invoiceOptionName} (${numberAsCurrency(row.invoiceOptionAmount)}/mo)`;
        }
        return (
          <span style={{ color: "#f57c00" }}>
            ⚠ Not configured — <Link to={billingPath}>Set up Invoice Option →</Link>
          </span>
        );
      },
    },
    {
      id: "active", label: "Active",
      cell: (row: RentalType) => row.active
        ? <StatusLabel label="Active" color={Status.Success} />
        : <StatusLabel label="Disabled" color={Status.Danger} />,
    },
    {
      id: "actions", label: "",
      cell: (row: RentalType) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button size="small" variant="outlined" onClick={e => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
          <Button size="small" variant="outlined" color="secondary" onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Grid container justify="space-between" alignItems="center">
          <Typography variant="h6">Rental Types</Typography>
          <Button variant="contained" color="primary" onClick={openCreate}>Add Type</Button>
        </Grid>
        <Typography variant="body2" color="textSecondary" style={{ marginTop: "8px" }}>
          Each rental type links to a billing plan. Spots are assigned a type and members
          are billed via that type's plan when they claim a spot.
          If a type has no billing plan, <Link to={billingPath}>create one in Billing Options →</Link>
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <StatefulTable
          id="admin-rental-types-table" title="Rental Types"
          loading={isRequesting} data={Object.values(rentalTypes)} error={error}
          totalItems={extractTotalItems(response)}
          selectedIds={selectedId} setSelectedIds={setSelectedId}
          columns={columns} rowId={rowId} renderSearch={false}
        />
      </Grid>

      {modalOpen && (
        <FormModal
          id="rental-type-form" isOpen={modalOpen}
          title={isEditing ? `Edit Type — ${editTarget.displayName}` : "Add Rental Type"}
          closeHandler={() => { setModalOpen(false); setEditTarget(emptyType()); }}
          onSubmit={handleSave}
          submitText={isEditing ? "Save Changes" : "Create Type"}
          loading={isSaving} error={createError || updateError}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Display Name"
                placeholder="e.g. Storage Tote, Full Shelf, Parking Space"
                value={editTarget.displayName || ""}
                onChange={e => setField("displayName", e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormLabel component="legend" style={{ marginBottom: "8px" }}>
                Billing Plan (Invoice Option)
              </FormLabel>
              {(invoiceOptions as InvoiceOption[]).length === 0 ? (
                <Typography variant="body2" style={warningBoxStyle}>
                  No rental invoice options found.{" "}
                  <Link to={billingPath}>Create one in Billing Options →</Link>
                </Typography>
              ) : (
                <Select fullWidth native
                  value={editTarget.invoiceOptionId || ""}
                  onChange={e => setField("invoiceOptionId", (e.target as HTMLSelectElement).value || null)}
                >
                  <option value="">None (set up later)</option>
                  {(invoiceOptions as InvoiceOption[]).map((opt: InvoiceOption) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} — {numberAsCurrency(opt.amount)}/mo
                    </option>
                  ))}
                </Select>
              )}
              <Typography variant="caption" color="textSecondary">
                Can't find the right plan?{" "}
                <Link to={billingPath}>Create it in Billing Options →</Link>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={editTarget.active !== false} color="primary"
                  onChange={e => setField("active", e.target.checked)} />}
                label="Active (available for new spots)"
              />
            </Grid>
          </Grid>
        </FormModal>
      )}

      <FormModal
        id="delete-rental-type" isOpen={!!deleteTarget} title="Delete Rental Type"
        closeHandler={() => setDeleteTarget(null)}
        onSubmit={() => deleteTarget && deleteType({ id: deleteTarget.id })}
        submitText="Delete" loading={deleting} error={deleteError}
      >
        {deleteTarget && (
          <>
            <Typography gutterBottom>
              Are you sure you want to delete the <strong>{deleteTarget.displayName}</strong> type?
            </Typography>
            <Typography variant="body2" style={warningBoxStyle}>
              Any spots assigned this type will lose their type link. Existing rentals are not affected.
            </Typography>
          </>
        )}
      </FormModal>
    </Grid>
  );
};

export default withQueryContext(AdminRentalTypes);
