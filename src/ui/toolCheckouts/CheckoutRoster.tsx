import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import Select from "@material-ui/core/Select";
import FormLabel from "@material-ui/core/FormLabel";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import BlockIcon from "@material-ui/icons/Block";
import AddIcon from "@material-ui/icons/Add";

import FormModal from "ui/common/FormModal";
import ErrorMessage from "ui/common/ErrorMessage";
import StatefulTable from "ui/common/table/StatefulTable";
import { Column } from "ui/common/table/Table";
import { SortDirection } from "ui/common/table/constants";
import { withQueryContext } from "ui/common/Filters/QueryContext";
import StatusLabel from "ui/common/StatusLabel";
import MemberSearchInput from "ui/common/MemberSearchInput";
import { SelectOption } from "ui/common/AsyncSelect";
import { Status } from "ui/constants";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import extractTotalItems from "ui/utils/extractTotalItems";
import { ToolCheckout, Shop, Tool } from "app/entities/toolCheckout";
import {
  listToolCheckouts,
  adminCreateToolCheckout,
  adminRevokeToolCheckout,
  listShops,
  listTools,
} from "api/toolCheckouts";

const rowId = (c: ToolCheckout) => c.id;

// ── RevokeModal ───────────────────────────────────────────────────────────────

interface RevokeModalProps {
  target: ToolCheckout | null;
  onClose: () => void;
  onRevoke: (reason: string) => void;
  loading: boolean;
  error: string;
}

const RevokeModal: React.FC<RevokeModalProps> = ({ target, onClose, onRevoke, loading, error }) => {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => { if (!target) setReason(""); }, [target]);
  return (
    <FormModal
      id="revoke-checkout" isOpen={!!target} title="Revoke Checkout"
      closeHandler={onClose}
      onSubmit={() => reason.trim() && onRevoke(reason)}
      submitText="Revoke" loading={loading} error={error}
    >
      {target && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography>
              Revoke <strong>{target.memberName}</strong>'s checkout for{" "}
              <strong>{target.toolName}</strong> in <strong>{target.shopName}</strong>?
            </Typography>
            <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 4 }}>
              The member will be notified via Slack DM. The reason is internal only.
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth required label="Reason for revocation (internal)"
              placeholder="e.g. Failed to follow safety protocols"
              multiline rows={2} value={reason}
              onChange={e => setReason(e.target.value)} autoFocus
            />
          </Grid>
        </Grid>
      )}
    </FormModal>
  );
};

// ── CheckoutModal ─────────────────────────────────────────────────────────────

interface CheckoutModalProps {
  shops: Shop[];
  tools: Tool[];
  preselectedMember?: { id: string; name: string };
  onClose: () => void;
  onCheckout: (memberId: string, toolId: string) => void;
  loading: boolean;
  error: string;
  unmetPrerequisites?: string[];
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  shops, tools, preselectedMember, onClose, onCheckout, loading, error, unmetPrerequisites
}) => {
  const [selectedMember, setSelectedMember] = React.useState<SelectOption | null>(
    preselectedMember ? { id: preselectedMember.id, value: preselectedMember.id, label: preselectedMember.name } : null
  );
  const [shopId, setShopId] = React.useState("");
  const [toolId, setToolId] = React.useState("");

  const shopTools = tools.filter(t => t.shopId === shopId);
  const selectedTool = tools.find(t => t.id === toolId);

  return (
    <FormModal
      id="create-checkout" isOpen={true} title="Check Out Member on Tool"
      closeHandler={onClose}
      onSubmit={() => selectedMember && toolId && onCheckout(selectedMember.value, toolId)}
      submitText="Check Out" loading={loading} error={error}
    >
      <Grid container spacing={2}>
        {unmetPrerequisites && unmetPrerequisites.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" style={{ color: "#e65100", padding: "8px", backgroundColor: "#fff8e1", borderRadius: 4 }}>
              ⚠ Prerequisite not met: {unmetPrerequisites.join(", ")}. You may proceed but the member should complete prerequisites first.
            </Typography>
          </Grid>
        )}
        <Grid item xs={12}>
          <FormLabel style={{ marginBottom: 6, display: "block" }}>Member *</FormLabel>
          {preselectedMember ? (
            <Typography><strong>{preselectedMember.name}</strong></Typography>
          ) : (
            <MemberSearchInput
              name="checkout-member-search"
              placeholder="Search by name or email"
              onChange={(opt: SelectOption) => setSelectedMember(opt || null)}
              initialSelection={selectedMember}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormLabel style={{ fontSize: 12 }}>Shop *</FormLabel>
          <Select native fullWidth value={shopId}
            onChange={e => { setShopId((e.target as HTMLSelectElement).value); setToolId(""); }}>
            <option value="">— select shop —</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormLabel style={{ fontSize: 12 }}>Tool *</FormLabel>
          <Select native fullWidth value={toolId} disabled={!shopId}
            onChange={e => setToolId((e.target as HTMLSelectElement).value)}>
            <option value="">— select tool —</option>
            {shopTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Grid>
        {selectedTool?.prerequisiteNames?.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="caption" color="textSecondary">
              Prerequisites for {selectedTool.name}: {selectedTool.prerequisiteNames.join(", ")}
            </Typography>
          </Grid>
        )}
      </Grid>
    </FormModal>
  );
};

// ── CheckoutRoster ────────────────────────────────────────────────────────────

interface Props {
  preselectedMember?: { id: string; name: string };
  isAdmin: boolean;
  isResourceManager: boolean;
}

const CheckoutRoster: React.FC<Props> = ({ preselectedMember, isAdmin, isResourceManager }) => {
  const [shopFilter, setShopFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "revoked">("active");
  const [revokeTarget, setRevokeTarget] = React.useState<ToolCheckout | null>(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [unmetPrerequisites, setUnmetPrerequisites] = React.useState<string[]>([]);

  const canManage = isAdmin || isResourceManager;

  const checkoutParams = {
    ...(preselectedMember && { memberId: preselectedMember.id }),
    ...(shopFilter && { shopId: shopFilter }),
    ...(activeFilter === "active" && { active: true }),
    ...(activeFilter === "revoked" && { active: false }),
  };

  const { isRequesting, data: checkouts = [], response, refresh, error: loadError } =
    useReadTransaction(listToolCheckouts, checkoutParams, undefined,
      `checkouts-${preselectedMember?.id || "all"}-${shopFilter}-${activeFilter}`);

  const { data: shops = [] } = useReadTransaction(listShops, {}, undefined, "shops-roster");
  const { data: tools = [] } = useReadTransaction(listTools, {}, undefined, "tools-roster");

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const onSuccess = React.useCallback((state: any) => {
    const unmet = state?.response?.data?.unmetPrerequisites;
    if (unmet?.length) setUnmetPrerequisites(unmet);
    setCheckoutOpen(false);
    setRevokeTarget(null);
    refreshRef.current();
  }, []);

  const { call: createCheckout, isRequesting: creating, error: createError } =
    useWriteTransaction(adminCreateToolCheckout, onSuccess);
  const { call: revokeCheckout, isRequesting: revoking, error: revokeError } =
    useWriteTransaction(adminRevokeToolCheckout, onSuccess);

  const handleCheckout = React.useCallback((memberId: string, toolId: string) => {
    setUnmetPrerequisites([]);
    createCheckout({ body: { memberId, toolId } });
  }, [createCheckout]);

  const handleRevoke = React.useCallback((reason: string) => {
    if (!revokeTarget) return;
    revokeCheckout({ id: revokeTarget.id, body: { revocationReason: reason } });
  }, [revokeCheckout, revokeTarget]);

  const columns: Column<ToolCheckout>[] = [
    {
      id: "memberName",
      label: "Member",
      defaultSortDirection: SortDirection.Asc,
      cell: (row: ToolCheckout) => (
        <div>
          <Typography variant="body2"><strong>{row.memberName}</strong></Typography>
          <Typography variant="caption" color="textSecondary">{row.memberEmail}</Typography>
        </div>
      ),
    },
    {
      id: "toolName",
      label: "Tool",
      defaultSortDirection: SortDirection.Asc,
      cell: (row: ToolCheckout) => (
        <div>
          <Typography variant="body2">{row.toolName}</Typography>
          <Typography variant="caption" color="textSecondary">{row.shopName}</Typography>
        </div>
      ),
    },
    {
      id: "checkedOutAt",
      label: "Checked Out",
      defaultSortDirection: SortDirection.Desc,
      cell: (row: ToolCheckout) => (
        <div>
          <Typography variant="body2">{new Date(row.checkedOutAt).toLocaleDateString()}</Typography>
          <Typography variant="caption" color="textSecondary">via {row.signedOffVia}</Typography>
        </div>
      ),
    },
    {
      id: "approvedByName",
      label: "Approved By",
      cell: (row: ToolCheckout) => <span>{row.approvedByName || "—"}</span>,
    },
    {
      id: "active",
      label: "Status",
      cell: (row: ToolCheckout) => row.active
        ? <StatusLabel label="Active" color={Status.Success} />
        : <StatusLabel label="Revoked" color={Status.Danger} />,
    },
    ...canManage ? [{
      id: "actions",
      label: "",
      cell: (row: ToolCheckout) => row.active ? (
        <Tooltip title="Revoke checkout">
          <IconButton size="small" color="secondary"
            onClick={e => { e.stopPropagation(); setRevokeTarget(row); }}>
            <BlockIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null,
    }] : [],
  ];

  return (
    <Grid container spacing={3}>
      {!preselectedMember && (
        <Grid item xs={12}>
          <Grid container justify="space-between" alignItems="center">
            <div>
              <Typography variant="h6">Tool Checkout Roster</Typography>
              <Typography variant="body2" color="textSecondary">
                All member tool checkouts across all shops.
              </Typography>
            </div>
            {canManage && (
              <Button variant="contained" color="primary" startIcon={<AddIcon />}
                onClick={() => { setUnmetPrerequisites([]); setCheckoutOpen(true); }}>
                Check Out Member
              </Button>
            )}
          </Grid>
        </Grid>
      )}

      {preselectedMember && canManage && (
        <Grid item xs={12}>
          <Button variant="outlined" color="primary" startIcon={<AddIcon />}
            onClick={() => { setUnmetPrerequisites([]); setCheckoutOpen(true); }}>
            Add Checkout
          </Button>
        </Grid>
      )}

      {/* Filters */}
      <Grid item xs={12} sm={4}>
        <FormLabel style={{ fontSize: 12 }}>Filter by Shop</FormLabel>
        <Select native fullWidth value={shopFilter}
          onChange={e => setShopFilter((e.target as HTMLSelectElement).value)}>
          <option value="">All Shops</option>
          {(shops as Shop[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormLabel style={{ fontSize: 12 }}>Status</FormLabel>
        <Select native fullWidth value={activeFilter}
          onChange={e => setActiveFilter((e.target as HTMLSelectElement).value as any)}>
          <option value="active">Active only</option>
          <option value="revoked">Revoked only</option>
          <option value="all">All</option>
        </Select>
      </Grid>

      {loadError && <Grid item xs={12}><ErrorMessage error={loadError} /></Grid>}

      <Grid item xs={12}>
        <StatefulTable
          id="checkout-roster-table"
          title={preselectedMember ? "Tool Checkouts" : "All Checkouts"}
          loading={isRequesting}
          data={checkouts as ToolCheckout[]}
          error={loadError}
          columns={columns}
          rowId={rowId}
          totalItems={extractTotalItems(response)}
          selectedIds={undefined}
          setSelectedIds={() => {}}
          renderSearch={true}
        />
      </Grid>

      {checkoutOpen && (
        <CheckoutModal
          shops={shops as Shop[]}
          tools={tools as Tool[]}
          preselectedMember={preselectedMember}
          onClose={() => setCheckoutOpen(false)}
          onCheckout={handleCheckout}
          loading={creating}
          error={createError}
          unmetPrerequisites={unmetPrerequisites}
        />
      )}

      <RevokeModal
        target={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onRevoke={handleRevoke}
        loading={revoking}
        error={revokeError}
      />
    </Grid>
  );
};

export default withQueryContext(CheckoutRoster);
