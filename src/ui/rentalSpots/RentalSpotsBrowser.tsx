import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import MenuItem from "@material-ui/core/MenuItem";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { Member } from "makerspace-ts-api-client";

import { RentalSpot, RentalType } from "app/entities/rentalSpot";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import useRentalEligibility from "ui/rentals/useRentalEligibility";
import ErrorMessage from "ui/common/ErrorMessage";
import { listRentalSpots, listRentalTypes, createRental } from "api/rentals";
import RentalAgreementInline from "ui/rentals/RentalAgreementInline";

interface Props {
  member:          Member;
  onRentalCreated: () => void;
}

const infoBoxStyle: React.CSSProperties = {
  padding: "10px 14px", backgroundColor: "#e3f2fd",
  borderRadius: "4px", border: "1px solid #90caf9",
  marginBottom: "12px", fontSize: "0.875rem"
};

const warningBoxStyle: React.CSSProperties = {
  padding: "10px 14px", backgroundColor: "#fff3e0",
  borderRadius: "4px", border: "1px solid #ffb74d",
  marginBottom: "8px", fontSize: "0.875rem"
};

type Step = "select" | "agreement" | "confirm";

const RentalSpotsBrowser: React.FC<Props> = ({ member, onRentalCreated }) => {
  const [selectedRentalId, setSelectedRentalId] = React.useState<string>("");
  const [requestNotes,     setRequestNotes]      = React.useState<string>("");
  const [step,             setStep]              = React.useState<Step>("select");
  const [agreementSigned,  setAgreementSigned]   = React.useState(false);

  const eligibility = useRentalEligibility(member);

  const { data: rentalTypes = [], isRequesting: typesLoading } = useReadTransaction(
    listRentalTypes, {}, undefined, "rental-types-browser"
  );

  const { data: rentals = [], isRequesting: rentalsLoading } = useReadTransaction(
    listRentalSpots, { available: "true" }, undefined, "rental-spots-browser"
  );

  const onSuccess = React.useCallback(() => {
    setSelectedRentalId("");
    setRequestNotes("");
    setStep("select");
    setAgreementSigned(false);
    onRentalCreated();
  }, [onRentalCreated]);

  const { call: requestRental, isRequesting: requesting, error: requestError } = useWriteTransaction(
    createRental, onSuccess
  );

  const handleConfirm = React.useCallback(() => {
    if (!selectedRentalId) return;
    requestRental({ body: { rentalSpotId: selectedRentalId, notes: requestNotes } });
  }, [selectedRentalId, requestNotes, requestRental]);

  const selectedRental = (rentals as RentalSpot[]).find((s: RentalSpot) => s.id === selectedRentalId);
  const isLoading = typesLoading || rentalsLoading;

  // Group rentals by type for the dropdown
  const rentalsByType: Record<string, RentalSpot[]> = (rentals as RentalSpot[]).reduce(
    (acc: Record<string, RentalSpot[]>, rental: RentalSpot) => {
      const typeName = rental.rentalTypeDisplayName || "Other";
      if (!acc[typeName]) acc[typeName] = [];
      acc[typeName].push(rental);
      return acc;
    }, {}
  );

  const resetFlow = () => {
    setStep("select");
    setAgreementSigned(false);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Request a New Rental</Typography>
        <Divider style={{ marginBottom: "16px" }} />
      </Grid>

      {/* Eligibility warnings */}
      {!eligibility.loading && !eligibility.eligible && (
        <Grid item xs={12}>
          {eligibility.reasons.map((reason, i) => (
            <Typography key={i} variant="body2" style={warningBoxStyle}>⚠ {reason}</Typography>
          ))}
        </Grid>
      )}

      {isLoading && (
        <Grid item xs={12}>
          <CircularProgress size={24} />
          <Typography variant="body2" display="inline" style={{ marginLeft: 8 }}>Loading available rentals...</Typography>
        </Grid>
      )}

      {!isLoading && rentals.length === 0 && (
        <Grid item xs={12}>
          <Typography color="textSecondary">No rentals are currently available.</Typography>
        </Grid>
      )}

      {!isLoading && rentals.length > 0 && (
        <>
          {/* Rental selector dropdown */}
          <Grid item xs={12} sm={8} md={6}>
            <TextField
              select fullWidth
              label="Select an Available Rental"
              value={selectedRentalId}
              onChange={e => { setSelectedRentalId(e.target.value); setStep("select"); setAgreementSigned(false); }}
              variant="outlined"
              disabled={!eligibility.eligible || eligibility.loading}
              helperText="Choose the rental you'd like"
            >
              <MenuItem value="">— Choose a rental —</MenuItem>
              {Object.entries(rentalsByType).map(([typeName, typeRentals]) => [
                <MenuItem key={`header-${typeName}`} disabled style={{ fontWeight: "bold", opacity: 1, color: "#333" }}>
                  {typeName}
                </MenuItem>,
                ...(typeRentals as RentalSpot[]).map((rental: RentalSpot) => (
                  <MenuItem key={rental.id} value={rental.id} style={{ paddingLeft: "24px" }}>
                    {rental.number} — {rental.location}
                    {rental.invoiceOptionAmount != null && ` ($${rental.invoiceOptionAmount}/mo)`}
                    {rental.requiresApproval && " ⏳ Approval required"}
                  </MenuItem>
                ))
              ])}
            </TextField>
          </Grid>

          {/* Details panel */}
          {selectedRental && (
            <Grid item xs={12}>
              <div style={{ padding: "12px 16px", border: "1px solid #ddd", borderRadius: "4px", marginTop: "4px" }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2"><strong>Rental:</strong> {selectedRental.number}</Typography>
                    <Typography variant="body2"><strong>Location:</strong> {selectedRental.location}</Typography>
                    <Typography variant="body2"><strong>Type:</strong> {selectedRental.rentalTypeDisplayName}</Typography>
                    {selectedRental.description && (
                      <Typography variant="body2"><strong>Description:</strong> {selectedRental.description}</Typography>
                    )}
                    {selectedRental.invoiceOptionAmount != null && (
                      <Typography variant="body2"><strong>Cost:</strong> ${selectedRental.invoiceOptionAmount}/mo ({selectedRental.invoiceOptionName})</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {selectedRental.requiresApproval ? (
                      <Typography variant="body2" style={infoBoxStyle}>
                        ⏳ This rental requires admin approval. You will be notified by email once reviewed. No charge until approved.
                      </Typography>
                    ) : (
                      <Typography variant="body2" style={infoBoxStyle}>
                        ✓ This rental is auto-approved. An invoice will be generated immediately. <strong>Rental is not valid until payment is received.</strong>
                      </Typography>
                    )}
                  </Grid>
                  {selectedRental.requiresApproval && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth multiline rows={2}
                        label="Notes for admin (optional)"
                        placeholder="Any additional information for your request..."
                        value={requestNotes}
                        onChange={e => setRequestNotes(e.target.value)}
                        variant="outlined" size="small"
                      />
                    </Grid>
                  )}
                </Grid>
              </div>
            </Grid>
          )}

          {/* Action button */}
          {selectedRental && (
            <Grid item xs={12}>
              <Button
                variant="contained" color="primary"
                disabled={!selectedRentalId || !eligibility.eligible || eligibility.loading}
                onClick={() => setStep("agreement")}
              >
                {selectedRental.requiresApproval ? "Continue to Agreement" : "Continue to Agreement"}
              </Button>
            </Grid>
          )}
        </>
      )}

      {/* Step 2 — Rental Agreement */}
      <Dialog open={step === "agreement"} fullWidth maxWidth="md" onClose={resetFlow}>
        <DialogTitle>Rental Agreement</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Please review and sign the rental agreement before proceeding.
          </Typography>
          <RentalAgreementInline
            onSigned={() => setAgreementSigned(true)}
            signed={agreementSigned}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={resetFlow}>Cancel</Button>
          <Button
            variant="contained" color="primary"
            disabled={!agreementSigned}
            onClick={() => setStep("confirm")}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Step 3 — Confirm */}
      <Dialog open={step === "confirm"} onClose={resetFlow}>
        <DialogTitle>
          {selectedRental?.requiresApproval ? "Confirm Rental Request" : "Confirm Rental"}
        </DialogTitle>
        <DialogContent>
          {selectedRental && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body1" gutterBottom>
                  <strong>{selectedRental.number}</strong> — {selectedRental.location}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {selectedRental.description}
                </Typography>
                {selectedRental.invoiceOptionAmount != null && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Cost:</strong> ${selectedRental.invoiceOptionAmount}/mo
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                {selectedRental.requiresApproval ? (
                  <Typography variant="body2" style={infoBoxStyle}>
                    Your request will be sent to an admin for approval. You will be notified by email and Slack once reviewed. No charge until approved.
                  </Typography>
                ) : (
                  <Typography variant="body2" style={{ ...infoBoxStyle, backgroundColor: "#fff3e0", borderColor: "#ffb74d" }}>
                    ⚠ <strong>An invoice will be generated immediately.</strong> Your rental is not valid until payment is received. Go to your Invoices tab to pay.
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
          <ErrorMessage error={requestError} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStep("agreement")}>Back</Button>
          <Button variant="contained" color="primary" disabled={requesting} onClick={handleConfirm}>
            {requesting ? "Processing..." : (selectedRental?.requiresApproval ? "Submit Request" : "Confirm Rental")}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default RentalSpotsBrowser;
