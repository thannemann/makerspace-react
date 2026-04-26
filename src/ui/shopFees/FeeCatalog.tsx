import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import SaveIcon from "@material-ui/icons/Save";
import CancelIcon from "@material-ui/icons/Cancel";
import AddIcon from "@material-ui/icons/Add";

import FormModal from "ui/common/FormModal";
import ErrorMessage from "ui/common/ErrorMessage";
import LoadingOverlay from "ui/common/LoadingOverlay";
import StatusLabel from "ui/common/StatusLabel";
import { Status } from "ui/constants";
import { numberAsCurrency } from "ui/utils/numberAsCurrency";
import StatefulTable from "ui/common/table/StatefulTable";
import { Column } from "ui/common/table/Table";
import { SortDirection } from "ui/common/table/constants";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import extractTotalItems from "ui/utils/extractTotalItems";

import { ShopFeeItem } from "app/entities/shopFee";
import {
  listShopFeeItems,
  adminCreateShopFeeItem,
  adminUpdateShopFeeItem,
  adminDeleteShopFeeItem,
} from "api/shopFees";

const rowId = (item: ShopFeeItem) => item.id;

interface EditState {
  name: string;
  description: string;
  amount: string;
}

const emptyEdit = (): EditState => ({ name: "", description: "", amount: "" });

const FeeCatalog: React.FC = () => {
  const [addOpen, setAddOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ShopFeeItem | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editState, setEditState] = React.useState<EditState>(emptyEdit());
  const [newItem, setNewItem] = React.useState<EditState>(emptyEdit());
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);

  const {
    isRequesting,
    data: items = [],
    response,
    refresh,
    error: loadError,
  } = useReadTransaction(listShopFeeItems, {}, undefined, "shop-fee-items");

  const onMutateSuccess = React.useCallback(() => {
    setAddOpen(false);
    setDeleteTarget(null);
    setEditingId(null);
    setEditState(emptyEdit());
    setNewItem(emptyEdit());
    refresh();
  }, [refresh]);

  const { call: createItem, isRequesting: creating, error: createError } =
    useWriteTransaction(adminCreateShopFeeItem, onMutateSuccess);
  const { call: updateItem, isRequesting: updating, error: updateError } =
    useWriteTransaction(adminUpdateShopFeeItem, onMutateSuccess);
  const { call: deleteItem, isRequesting: deleting, error: deleteError } =
    useWriteTransaction(adminDeleteShopFeeItem, onMutateSuccess);

  const startEdit = (item: ShopFeeItem) => {
    setEditingId(item.id);
    setEditState({ name: item.name, description: item.description || "", amount: item.amount });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(emptyEdit());
  };

  const saveEdit = (item: ShopFeeItem) => {
    if (!editState.name || !editState.amount) return;
    updateItem({ id: item.id, body: { ...editState } as Partial<ShopFeeItem> });
  };

  const saveNew = () => {
    if (!newItem.name || !newItem.amount) return;
    createItem({ body: { ...newItem } as Partial<ShopFeeItem> });
  };

  const isEditing = (id: string) => editingId === id;
  const isSaving = creating || updating;

  const columns: Column<ShopFeeItem>[] = [
    {
      id: "name",
      label: "Item Name",
      defaultSortDirection: SortDirection.Asc,
      cell: (row: ShopFeeItem) =>
        isEditing(row.id) ? (
          <TextField
            size="small"
            value={editState.name}
            onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
            placeholder="Item name"
            fullWidth
            autoFocus
          />
        ) : (
          <span>{row.name}</span>
        ),
    },
    {
      id: "description",
      label: "Description",
      defaultSortDirection: SortDirection.Asc,
      cell: (row: ShopFeeItem) =>
        isEditing(row.id) ? (
          <TextField
            size="small"
            value={editState.description}
            onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
            placeholder="Optional description"
            fullWidth
          />
        ) : (
          <span style={{ color: row.description ? "inherit" : "#aaa" }}>
            {row.description || "—"}
          </span>
        ),
    },
    {
      id: "amount",
      label: "Unit Price",
      defaultSortDirection: SortDirection.Desc,
      cell: (row: ShopFeeItem) =>
        isEditing(row.id) ? (
          <TextField
            size="small"
            value={editState.amount}
            onChange={e => setEditState(s => ({ ...s, amount: e.target.value }))}
            placeholder="0.00"
            type="number"
            inputProps={{ min: "0.01", step: "0.01" }}
            style={{ width: 100 }}
          />
        ) : (
          <strong>{numberAsCurrency(row.amount)}</strong>
        ),
    },
    {
      id: "status",
      label: "Status",
      cell: (row: ShopFeeItem) =>
        row.disabled ? (
          <StatusLabel label="Disabled" color={Status.Warn} />
        ) : (
          <StatusLabel label="Active" color={Status.Success} />
        ),
    },
    {
      id: "actions",
      label: "",
      cell: (row: ShopFeeItem) =>
        isEditing(row.id) ? (
          <div style={{ display: "flex", gap: 4 }}>
            <Tooltip title="Save changes">
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  disabled={isSaving}
                  onClick={() => saveEdit(row)}
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Cancel">
              <IconButton size="small" onClick={cancelEdit}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={e => { e.stopPropagation(); startEdit(row); }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="secondary"
                onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        ),
    },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Grid container justify="space-between" alignItems="center">
          <div>
            <Typography variant="h6">Fee Catalog</Typography>
            <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
              Pre-defined items available when sending shop charges to members.
              Prices can be overridden at invoice time.
            </Typography>
          </div>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
          >
            Add Item
          </Button>
        </Grid>
      </Grid>

      {loadError && (
        <Grid item xs={12}>
          <ErrorMessage error={loadError} />
        </Grid>
      )}
      {(updateError) && (
        <Grid item xs={12}>
          <ErrorMessage error={updateError} />
        </Grid>
      )}

      <Grid item xs={12} style={{ position: "relative" }}>
        <StatefulTable
          id="shop-fee-catalog-table"
          title="Catalog Items"
          loading={isRequesting}
          data={items as ShopFeeItem[]}
          error={loadError}
          columns={columns}
          rowId={rowId}
          totalItems={extractTotalItems(response)}
          selectedIds={selectedId}
          setSelectedIds={setSelectedId}
          renderSearch={true}
        />
        {isSaving && <LoadingOverlay id="fee-catalog-saving" contained />}
      </Grid>

      {/* Add new item modal */}
      {addOpen && (
        <FormModal
          id="add-fee-item"
          isOpen={true}
          title="Add Catalog Item"
          closeHandler={() => { setAddOpen(false); setNewItem(emptyEdit()); }}
          onSubmit={saveNew}
          submitText="Add Item"
          loading={creating}
          error={createError}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Item Name"
                placeholder="e.g. Router Bit Replacement, Steel Stock 1ft"
                value={newItem.name}
                onChange={e => setNewItem(s => ({ ...s, name: e.target.value }))}
                autoFocus
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                placeholder="Optional — shown on the invoice"
                value={newItem.description}
                onChange={e => setNewItem(s => ({ ...s, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Unit Price ($)"
                placeholder="0.00"
                type="number"
                inputProps={{ min: "0.01", step: "0.01" }}
                value={newItem.amount}
                onChange={e => setNewItem(s => ({ ...s, amount: e.target.value }))}
              />
            </Grid>
          </Grid>
        </FormModal>
      )}

      {/* Delete confirmation modal */}
      <FormModal
        id="delete-fee-item"
        isOpen={!!deleteTarget}
        title="Delete Catalog Item"
        closeHandler={() => setDeleteTarget(null)}
        onSubmit={() => deleteTarget && deleteItem({ id: deleteTarget.id })}
        submitText="Delete"
        loading={deleting}
        error={deleteError}
      >
        {deleteTarget && (
          <Typography>
            Are you sure you want to remove <strong>{deleteTarget.name}</strong> from the
            catalog? This only removes it from the lookup list — existing invoices are
            not affected.
          </Typography>
        )}
      </FormModal>
    </Grid>
  );
};

export default FeeCatalog;
