import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import Select from "@material-ui/core/Select";
import FormLabel from "@material-ui/core/FormLabel";
import Chip from "@material-ui/core/Chip";
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
import { Shop, Tool } from "app/entities/toolCheckout";
import {
  listShops,
  listTools,
  adminCreateTool,
  adminUpdateTool,
  adminDeleteTool,
} from "api/toolCheckouts";

const rowId = (t: Tool) => t.id;

// ── AddToolModal ──────────────────────────────────────────────────────────────

interface AddToolModalProps {
  shops: Shop[];
  tools: Tool[];
  onClose: () => void;
  onSave: (body: { name: string; description: string; shopId: string; prerequisiteIds: string[] }) => void;
  loading: boolean;
  error: string;
}

const AddToolModal: React.FC<AddToolModalProps> = ({ shops, tools, onClose, onSave, loading, error }) => {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [shopId, setShopId] = React.useState(shops[0]?.id || "");
  const [prerequisiteIds, setPrerequisiteIds] = React.useState<string[]>([]);

  const togglePrereq = (id: string) => {
    setPrerequisiteIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const availablePrereqs = tools.filter(t => t.shopId === shopId);

  return (
    <FormModal
      id="add-tool" isOpen={true} title="Add Tool"
      closeHandler={onClose}
      onSubmit={() => name && shopId && onSave({ name, description, shopId, prerequisiteIds })}
      submitText="Add Tool" loading={loading} error={error}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormLabel style={{ fontSize: 12 }}>Shop *</FormLabel>
          <Select native fullWidth value={shopId} onChange={e => { setShopId((e.target as HTMLSelectElement).value); setPrerequisiteIds([]); }}>
            <option value="">— select shop —</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required label="Tool Name" placeholder="e.g. Bandsaw"
            value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Description" placeholder="Optional details"
            value={description} onChange={e => setDescription(e.target.value)} />
        </Grid>
        {availablePrereqs.length > 0 && (
          <Grid item xs={12}>
            <FormLabel style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
              Prerequisites (warning shown if not met — not a hard block)
            </FormLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {availablePrereqs.map(t => (
                <Chip
                  key={t.id}
                  label={t.name}
                  size="small"
                  onClick={() => togglePrereq(t.id)}
                  color={prerequisiteIds.includes(t.id) ? "primary" : "default"}
                  variant={prerequisiteIds.includes(t.id) ? "default" : "outlined"}
                  clickable
                />
              ))}
            </div>
          </Grid>
        )}
      </Grid>
    </FormModal>
  );
};

// ── EditToolRow ───────────────────────────────────────────────────────────────

interface EditToolRowProps {
  tool: Tool;
  onSave: (id: string, body: { name: string; description: string }) => void;
  onCancel: () => void;
  saving: boolean;
}

const EditToolRow: React.FC<EditToolRowProps> = ({ tool, onSave, onCancel, saving }) => {
  const [name, setName] = React.useState(tool.name);
  const [description, setDescription] = React.useState(tool.description || "");
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <TextField size="small" value={name} onChange={e => setName(e.target.value)}
        placeholder="Tool name" style={{ flex: 2 }} autoFocus />
      <TextField size="small" value={description} onChange={e => setDescription(e.target.value)}
        placeholder="Description" style={{ flex: 3 }} />
      <Tooltip title="Save"><span>
        <IconButton size="small" color="primary" disabled={saving || !name}
          onClick={() => onSave(tool.id, { name, description })}>
          <SaveIcon fontSize="small" />
        </IconButton>
      </span></Tooltip>
      <Tooltip title="Cancel">
        <IconButton size="small" onClick={onCancel}><CancelIcon fontSize="small" /></IconButton>
      </Tooltip>
    </div>
  );
};

// ── DeleteToolModal ───────────────────────────────────────────────────────────

interface DeleteToolModalProps {
  target: Tool | null;
  onClose: () => void;
  onDelete: () => void;
  loading: boolean;
  error: string;
}

const DeleteToolModal: React.FC<DeleteToolModalProps> = ({ target, onClose, onDelete, loading, error }) => (
  <FormModal id="delete-tool" isOpen={!!target} title="Delete Tool"
    closeHandler={onClose} onSubmit={onDelete} submitText="Delete" loading={loading} error={error}>
    {target && (
      <Typography>
        Delete <strong>{target.name}</strong> from <strong>{target.shopName}</strong>?
        Existing checkout records will be preserved.
      </Typography>
    )}
  </FormModal>
);

// ── ToolManager ───────────────────────────────────────────────────────────────

const ToolManager: React.FC = () => {
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Tool | null>(null);
  const [shopFilter, setShopFilter] = React.useState<string>("");

  const { data: shops = [] } = useReadTransaction(listShops, {}, undefined, "shops-for-tools");
  const { isRequesting, data: tools = [], response, refresh, error: loadError } =
    useReadTransaction(listTools, { shopId: shopFilter || undefined }, undefined, `tools-list-${shopFilter}`);

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const onSuccess = React.useCallback(() => {
    setAddOpen(false);
    setEditingId(null);
    setDeleteTarget(null);
    refreshRef.current();
  }, []);

  const { call: createTool, isRequesting: creating, error: createError } =
    useWriteTransaction(adminCreateTool, onSuccess);
  const { call: updateTool, isRequesting: updating, error: updateError } =
    useWriteTransaction(adminUpdateTool, onSuccess);
  const { call: deleteTool, isRequesting: deleting, error: deleteError } =
    useWriteTransaction(adminDeleteTool, onSuccess);

  const handleSave = React.useCallback((id: string, body: { name: string; description: string }) => {
    updateTool({ id, body });
  }, [updateTool]);

  const handleCancel = React.useCallback(() => setEditingId(null), []);

  const columns: Column<Tool>[] = [
    {
      id: "name",
      label: "Tool",
      defaultSortDirection: SortDirection.Asc,
      cell: (row: Tool) => editingId === row.id
        ? <EditToolRow tool={row} onSave={handleSave} onCancel={handleCancel} saving={updating} />
        : (
          <div>
            <Typography variant="body2"><strong>{row.name}</strong></Typography>
            {row.description && <Typography variant="caption" color="textSecondary">{row.description}</Typography>}
          </div>
        ),
    },
    {
      id: "shopName",
      label: "Shop",
      defaultSortDirection: SortDirection.Asc,
      cell: (row: Tool) => editingId === row.id ? null : <span>{row.shopName}</span>,
    },
    {
      id: "prerequisites",
      label: "Prerequisites",
      cell: (row: Tool) => editingId === row.id ? null : (
        <span style={{ color: row.prerequisiteNames?.length ? "inherit" : "#aaa" }}>
          {row.prerequisiteNames?.length ? row.prerequisiteNames.join(", ") : "None"}
        </span>
      ),
    },
    {
      id: "actions",
      label: "",
      cell: (row: Tool) => editingId === row.id ? null : (
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
            <Typography variant="h6">Tools</Typography>
            <Typography variant="body2" color="textSecondary">
              Manage tools within each shop. Tools with the same name in different shops are tracked independently.
            </Typography>
          </div>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add Tool
          </Button>
        </Grid>
      </Grid>
      <Grid item xs={12} md={4}>
        <FormLabel style={{ fontSize: 12 }}>Filter by Shop</FormLabel>
        <Select native fullWidth value={shopFilter}
          onChange={e => setShopFilter((e.target as HTMLSelectElement).value)}>
          <option value="">All Shops</option>
          {(shops as Shop[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Grid>
      {(loadError || updateError) && <Grid item xs={12}><ErrorMessage error={loadError || updateError} /></Grid>}
      <Grid item xs={12} style={{ position: "relative" }}>
        <StatefulTable
          id="tools-table" title="Tools" loading={isRequesting}
          data={tools as Tool[]} error={loadError} columns={columns}
          rowId={rowId} totalItems={extractTotalItems(response)}
          selectedIds={undefined} setSelectedIds={() => {}} renderSearch={true}
        />
        {updating && <LoadingOverlay id="tool-saving" contained />}
      </Grid>
      {addOpen && (
        <AddToolModal
          shops={shops as Shop[]}
          tools={tools as Tool[]}
          onClose={() => setAddOpen(false)}
          onSave={(body) => createTool({ body })}
          loading={creating}
          error={createError}
        />
      )}
      <DeleteToolModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={() => deleteTarget && deleteTool({ id: deleteTarget.id })}
        loading={deleting}
        error={deleteError}
      />
    </Grid>
  );
};

export default withQueryContext(ToolManager);
