import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import SaveIcon from "@material-ui/icons/Save";
import CancelIcon from "@material-ui/icons/Cancel";

import FormModal from "ui/common/FormModal";
import ErrorMessage from "ui/common/ErrorMessage";
import LoadingOverlay from "ui/common/LoadingOverlay";
import StatefulTable from "ui/common/table/StatefulTable";
import { Column } from "ui/common/table/Table";
import { SortDirection } from "ui/common/table/constants";
import { withQueryContext } from "ui/common/Filters/QueryContext";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import extractTotalItems from "ui/utils/extractTotalItems";
import { Shop } from "app/entities/toolCheckout";
import {
  listShops,
  adminCreateShop,
  adminUpdateShop,
  adminDeleteShop,
} from "api/toolCheckouts";

const rowId = (s: Shop) => s.id;

// ── AddShopModal ──────────────────────────────────────────────────────────────

interface AddShopModalProps {
  onClose: () => void;
  onSave: (body: { name: string; slackChannel: string }) => void;
  loading: boolean;
  error: string;
}

const AddShopModal: React.FC<AddShopModalProps> = ({ onClose, onSave, loading, error }) => {
  const [name, setName] = React.useState("");
  const [slackChannel, setSlackChannel] = React.useState("");
  return (
    <FormModal
      id="add-shop"
      isOpen={true}
      title="Add Shop"
      closeHandler={onClose}
      onSubmit={() => name && onSave({ name, slackChannel })}
      submitText="Add Shop"
      loading={loading}
      error={error}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField fullWidth required label="Shop Name" placeholder="e.g. Woodshop" value={name}
            onChange={e => setName(e.target.value)} autoFocus />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Slack Channel" placeholder="e.g. shop-woodworking"
            value={slackChannel} onChange={e => setSlackChannel(e.target.value)}
            helperText="Used to route /checkout slash commands to this shop" />
        </Grid>
      </Grid>
    </FormModal>
  );
};

// ── EditShopRow ───────────────────────────────────────────────────────────────

interface EditShopRowProps {
  shop: Shop;
  onSave: (id: string, body: { name: string; slackChannel: string }) => void;
  onCancel: () => void;
  saving: boolean;
}

const EditShopRow: React.FC<EditShopRowProps> = ({ shop, onSave, onCancel, saving }) => {
  const [name, setName] = React.useState(shop.name);
  const [slackChannel, setSlackChannel] = React.useState(shop.slackChannel || "");
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <TextField size="small" value={name} onChange={e => setName(e.target.value)}
        placeholder="Shop name" style={{ flex: 2 }} autoFocus />
      <TextField size="small" value={slackChannel} onChange={e => setSlackChannel(e.target.value)}
        placeholder="slack-channel" style={{ flex: 2 }} />
      <Tooltip title="Save"><span>
        <IconButton size="small" color="primary" disabled={saving || !name}
          onClick={() => onSave(shop.id, { name, slackChannel })}>
          <SaveIcon fontSize="small" />
        </IconButton>
      </span></Tooltip>
      <Tooltip title="Cancel">
        <IconButton size="small" onClick={onCancel}><CancelIcon fontSize="small" /></IconButton>
      </Tooltip>
    </div>
  );
};

// ── DeleteShopModal ───────────────────────────────────────────────────────────

interface DeleteShopModalProps {
  target: Shop | null;
  onClose: () => void;
  onDelete: () => void;
  loading: boolean;
  error: string;
}

const DeleteShopModal: React.FC<DeleteShopModalProps> = ({ target, onClose, onDelete, loading, error }) => (
  <FormModal id="delete-shop" isOpen={!!target} title="Delete Shop"
    closeHandler={onClose} onSubmit={onDelete} submitText="Delete" loading={loading} error={error}>
    {target && (
      <Typography>
        Delete <strong>{target.name}</strong>? This will also delete all tools in this shop.
        Existing checkout records will be preserved.
      </Typography>
    )}
  </FormModal>
);

// ── ShopManager ───────────────────────────────────────────────────────────────

const ShopManager: React.FC = () => {
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Shop | null>(null);

  const { isRequesting, data: shops = [], response, refresh, error: loadError } =
    useReadTransaction(listShops, {}, undefined, "shops-list");

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const onSuccess = React.useCallback(() => {
    setAddOpen(false);
    setEditingId(null);
    setDeleteTarget(null);
    refreshRef.current();
  }, []);

  const { call: createShop, isRequesting: creating, error: createError } =
    useWriteTransaction(adminCreateShop, onSuccess);
  const { call: updateShop, isRequesting: updating, error: updateError } =
    useWriteTransaction(adminUpdateShop, onSuccess);
  const { call: deleteShop, isRequesting: deleting, error: deleteError } =
    useWriteTransaction(adminDeleteShop, onSuccess);

  const handleSave = React.useCallback((id: string, body: { name: string; slackChannel: string }) => {
    updateShop({ id, body });
  }, [updateShop]);

  const handleCancel = React.useCallback(() => setEditingId(null), []);

  const columns: Column<Shop>[] = [
    {
      id: "name",
      label: "Shop",
      defaultSortDirection: SortDirection.Asc,
      cell: (row: Shop) => editingId === row.id
        ? <EditShopRow shop={row} onSave={handleSave} onCancel={handleCancel} saving={updating} />
        : <strong>{row.name}</strong>,
    },
    {
      id: "slackChannel",
      label: "Slack Channel",
      cell: (row: Shop) => editingId === row.id ? null
        : <span style={{ color: row.slackChannel ? "inherit" : "#aaa" }}>
            {row.slackChannel ? `#${row.slackChannel}` : "Not configured"}
          </span>,
    },
    {
      id: "toolCount",
      label: "Tools",
      cell: (row: Shop) => editingId === row.id ? null : <span>{(row as any).toolCount ?? 0}</span>,
    },
    {
      id: "actions",
      label: "",
      cell: (row: Shop) => editingId === row.id ? null : (
        <div style={{ display: "flex", gap: 4 }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={e => { e.stopPropagation(); setEditingId(row.id); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="secondary"
              onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}>
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
            <Typography variant="h6">Shops</Typography>
            <Typography variant="body2" color="textSecondary">
              Manage shop locations. Each shop can be linked to a Slack channel for slash command checkout sign-offs.
            </Typography>
          </div>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add Shop
          </Button>
        </Grid>
      </Grid>
      {(loadError || updateError) && <Grid item xs={12}><ErrorMessage error={loadError || updateError} /></Grid>}
      <Grid item xs={12} style={{ position: "relative" }}>
        <StatefulTable
          id="shops-table" title="Shops" loading={isRequesting}
          data={shops as Shop[]} error={loadError} columns={columns}
          rowId={rowId} totalItems={extractTotalItems(response)}
          selectedIds={undefined} setSelectedIds={() => {}} renderSearch={false}
        />
        {updating && <LoadingOverlay id="shop-saving" contained />}
      </Grid>
      {addOpen && (
        <AddShopModal
          onClose={() => setAddOpen(false)}
          onSave={(body) => createShop({ body })}
          loading={creating}
          error={createError}
        />
      )}
      <DeleteShopModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={() => deleteTarget && deleteShop({ id: deleteTarget.id })}
        loading={deleting}
        error={deleteError}
      />
    </Grid>
  );
};

export default withQueryContext(ShopManager);
