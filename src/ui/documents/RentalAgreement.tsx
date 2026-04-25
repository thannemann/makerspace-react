import * as React from "react";
import useReactRouter from "use-react-router";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";

import { updateRental } from "makerspace-ts-api-client";
import { buildProfileRouting } from "../member/utils";
import { useAuthState } from "../reducer/hooks";
import useWriteTransaction from "../hooks/useWriteTransaction";
import DocumentForm from "./DocumentForm";
import { Documents, documents } from "./Document";
import { useScrollToHeader } from "../hooks/useScrollToHeader";
import { declineRentalAgreement } from "api/rentals";
import ErrorMessage from "ui/common/ErrorMessage";

const rentalAgreement = documents[Documents.RentalAgreement];

const RentalAgreement: React.FC<{ rentalId: string }> = ({ rentalId }) => {
  const { history } = useReactRouter();
  const { currentUser: { id: currentUserId } } = useAuthState();
  const { executeScroll } = useScrollToHeader();
  const [declineConfirmOpen, setDeclineConfirmOpen] = React.useState(false);

  const onSignSuccess = React.useCallback(() => {
    executeScroll();
    // Redirect to invoices tab after signing
    history.push(`${buildProfileRouting(currentUserId)}/invoices`);
  }, [history, executeScroll, currentUserId]);

  const onDeclineSuccess = React.useCallback(() => {
    setDeclineConfirmOpen(false);
    // Redirect back to profile rentals tab
    history.push(`${buildProfileRouting(currentUserId)}/rentals`);
  }, [history, currentUserId]);

  const {
    error: signError,
    isRequesting: signing,
    call: sign
  } = useWriteTransaction(updateRental, onSignSuccess);

  const {
    error: declineError,
    isRequesting: declining,
    call: decline
  } = useWriteTransaction(declineRentalAgreement, onDeclineSuccess);

  const onContractAccept = React.useCallback(async (signature: string) => {
    await sign({ id: rentalId, body: { signature } });
  }, [sign, rentalId]);

  const onDeclineConfirm = React.useCallback(async () => {
    await decline({ id: rentalId });
  }, [decline, rentalId]);

  return (
    <Paper>
      {/* I Do Not Agree button — prominent at top */}
      <Grid container justify="flex-end" style={{ padding: "16px 16px 0" }}>
        <Button
          id="rental-agreement-decline"
          variant="outlined"
          color="secondary"
          onClick={() => setDeclineConfirmOpen(true)}
          disabled={signing}
        >
          I Do Not Agree
        </Button>
      </Grid>

      <DocumentForm
        error={signError}
        loading={signing}
        doc={{
          ...rentalAgreement,
          src: typeof rentalAgreement.src === "function"
            ? rentalAgreement.src(rentalId)
            : rentalAgreement.src
        }}
        onAccept={onContractAccept}
        requestSignature={true}
      />

      {/* Decline confirmation dialog */}
      <Dialog open={declineConfirmOpen} onClose={() => setDeclineConfirmOpen(false)}>
        <DialogTitle>Cancel Rental Agreement</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you do not agree to the rental agreement?
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            If you decline, your rental claim will be <strong>voided</strong> and no invoice will be generated. The spot will become available for other members.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            You can always request a new rental in the future.
          </Typography>
          <ErrorMessage error={declineError} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeclineConfirmOpen(false)} disabled={declining}>
            Go Back
          </Button>
          <Button
            id="rental-agreement-decline-confirm"
            variant="contained"
            color="secondary"
            disabled={declining}
            onClick={onDeclineConfirm}
          >
            {declining ? "Cancelling..." : "Yes, Void My Rental"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RentalAgreement;
