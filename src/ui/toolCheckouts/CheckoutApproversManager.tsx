import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import Chip from "@material-ui/core/Chip";
import FormLabel from "@material-ui/core/FormLabel";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";

import FormModal from "ui/common/FormModal";
import ErrorMessage from "ui/common/ErrorMessage";
import StatefulTable from "ui/common/table/StatefulTable";
import { Column } from "ui/common/table/Table";
import { SortDirection } from "ui/common/table/constants";
import { withQueryContext } from "ui/common/Filters/QueryContext";
import MemberSearchInput from "ui/common/MemberSearchInput";
import { SelectOption } from "ui/common/AsyncSelect";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import extractTotalItems from "ui/utils/extractTotalItems";
import { CheckoutApprover, Shop } from "app/entities/toolCheckout";
import {
  listCheckoutApprovers,
  adminCreateCheckoutApprover,
  adminDeleteCheckoutApprover,
  listShops,
} from "api/toolCheckouts";

const rowId = (a: CheckoutApprover) => a.id;

// ── AddApproverModal ──────────────────────────────────────────────────────────

interface AddApproverModalProps {
  shops: Shop[];
  onClose: () => void;
  onSave: (memberId: string, shopIds: string[]) => void;
  loading: boolean;
  error: string;
}

const AddApproverModal: React.FC<AddApproverModalProps> = ({ shops, onClose, onSave, loading, error }) => {
  const [selectedMember, setSelectedMember] = React.useState<SelectOption | null>(null);
  const [shopIds, setShopIds] = React.useState<string[]>([]);

  const toggleShop = (id: string) => {
    setShopIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <FormModal
      id="add-approver" isOpen={true} title="Add Checkout Approver"
      closeHandler={onClose}
      onSubmit={() => selectedMember && shopIds.length && onSave(selectedMember.value, shopIds)}
      submitText="Add Approver" loading={loading} error={error}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormLabel style={{ marginBottom: 6, display: "block" }}>Member *</FormLabel>
          <MemberSearchInput
            name="approver-member-search"
            placeholder="Search by name or email"
            onChange={(opt: SelectOption) => setSelectedMember(opt || null)}
            initialSelection={selectedMember}
          />
        </Grid>
        <Grid item xs={12}>
          <FormLabel style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
            Shops this member can approve checkouts for *
          </FormLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {shops.map(s => (
              <Chip
                key={s.id}
                label={s.name}
                size="small"
                onClick={() => toggleShop(s.id)}
                color={shopIds.includes(s.id) ? "primary" : "default"}
                variant={shopIds.includes(s.id) ? "default" : "outlined"}
                clickable
              />
            ))}
          </div>
          {shopIds.length === 0 && (
            <Typography variant="caption" color="error">Select at least one shop</Typography>
          )}
        </Grid>
      </Grid>
    </FormModal>
  );
};

// ── DeleteApproverModal ───────────────────────────────────────────────────────

interface DeleteApproverModalProps {
  target: CheckoutApprover | null;
  onClose: () => void;
  onDelete: () => void;
  loading: boolean;
  error: string;
}

const DeleteApproverModal: React.FC<DeleteApproverModalProps> = ({ target, onClose, onDelete, loading, error }) => (
  <FormModal id="delete-approver" isOpen={!!target} title="Remove Approver"
    closeHandler={onClose} onSubmit={onDelete} submitText="Remove" loading={loading} error={error}>
    {target && (
      <Typography>
        Remove <strong>{target.memberName}</strong> as a checkout approver?
        They will no longer be able to sign off checkouts via the portal or Slack.
      </Typography>
    )}
  </FormModal>
);

// ── CheckoutApproversManager ──────────────────────────────────────────────────

const CheckoutApproversManager: React.FC = () => {
  const [addOpen, setAddOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<CheckoutApprover | null>(null);

  const { isRequesting, data: approvers = [], response, refresh, error: loadError } =
    useReadTransaction(listCheckoutApprovers, {}, undefined, "checkout-approvers");
  const { data: shops = [] } = useReadTransaction(listShops, {}, undefined, "shops-approvers");

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const onSuccess = React.useCallback(() => {
    setAddOpen(false);
    setDeleteTarget(null);
    refreshRef.current();
  }, []);

  const { call: createApprover, isRequesting: creating, error: createError } =
    useWriteTransaction(adminCreateCheckoutApprover, onSuccess);
  const { call: deleteApprover, isRequesting: deleting, error: deleteError } =
    useWriteTransaction(adminDeleteCheckoutApprover, onSuccess);

  const columns: Column<CheckoutApprover>[] = [
    {
      id: "memberName",
      label: "Member",
      defaultSortDirection: SortDirection.Asc,
      cell: (row: CheckoutApprover) => (
        <div>
          <Typography variant="body2"><strong>{row.memberName}</strong></Typography>
          <Typography variant="caption" color="textSecondary">{row.memberEmail}</Typography>
        </div>
      ),
    },
    {
      id: "shopNames",
      label: "Authorized Shops",
      cell: (row: CheckoutApprover) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {row.shopNames?.map(name => (
            <Chip key={name} label={name} size="small" variant="outlined" />
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      label: "",
      cell: (row: CheckoutApprover) => (
        <Tooltip title="Remove approver">
          <IconButton size="small" color="secondary"
            onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Grid container justify="space-between" alignItems="center">
          <div>
            <Typography variant="h6">Checkout Approvers</Typography>
            <Typography variant="body2" color="textSecondary">
              Members who can sign off tool checkouts via the portal or Slack slash command,
              scoped to specific shops.
            </Typography>
          </div>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add Approver
          </Button>
        </Grid>
      </Grid>
      {loadError && <Grid item xs={12}><ErrorMessage error={loadError} /></Grid>}
      <Grid item xs={12}>
        <StatefulTable
          id="approvers-table" title="Checkout Approvers" loading={isRequesting}
          data={approvers as CheckoutApprover[]} error={loadError} columns={columns}
          rowId={rowId} totalItems={extractTotalItems(response)}
          selectedIds={undefined} setSelectedIds={() => {}} renderSearch={false}
        />
      </Grid>
      {addOpen && (
        <AddApproverModal
          shops={shops as Shop[]}
          onClose={() => setAddOpen(false)}
          onSave={(memberId, shopIds) => createApprover({ body: { memberId, shopIds } })}
          loading={creating}
          error={createError}
        />
      )}
      <DeleteApproverModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={() => deleteTarget && deleteApprover({ id: deleteTarget.id })}
        loading={deleting}
        error={deleteError}
      />
    </Grid>
  );
};

export default withQueryContext(CheckoutApproversManager);
