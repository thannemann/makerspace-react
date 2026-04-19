import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import CircularProgress from "@material-ui/core/CircularProgress";
import TextField from "@material-ui/core/TextField";
import MenuItem from "@material-ui/core/MenuItem";
import { Member } from "makerspace-ts-api-client";

import { RentalSpot, RentalType } from "app/entities/rentalSpot";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import useRentalEligibility from "ui/rentals/useRentalEligibility";
import ErrorMessage from "ui/common/ErrorMessage";
import FormModal from "ui/common/FormModal";
import { listRentalSpots, listRentalTypes, createRental } from "api/rentals";

interface Props {
  member:          Member;
  onRentalCreated: () => void;
}

const infoBoxStyle: React.CSSProperties = {
  padding: "8px", backgroundColor: "#e3f2fd",
  borderRadius: "4px", border: "1px solid #90caf9", marginBottom: "8px"
};

const warningBoxStyle: React.CSSProperties = {
  padding: "8px", backgroundColor: "#fff3e0",
  borderRadius: "4px", border: "1px solid #ffcc02", marginBottom: "8px"
};

const RentalSpotsBrowser: React.FC<Props> = ({ member, onRentalCreated }) => {
  const [typeFilter,   setTypeFilter]   = React.useState<string>("all");
  const [selectedSpot, setSelectedSpot] = React.useState<RentalSpot | null>(null);
  const [requestNotes, setRequestNotes] = React.useState<string>("");

  const eligibility = useRentalEligibility(member);

  const { data: rentalTypes = [] } = useReadTransaction(
    listRentalTypes, {}, undefined, "rental-types-browser"
  );

  const { data: spots = [], isRequesting: spotsLoading, error: spotsError } = useReadTransaction(
    listRentalSpots, { available: "true" }, undefined, "rental-spots-browser"
  );

  const onSuccess = React.useCallback(() => {
    setSelectedSpot(null);
    setRequestNotes("");
    onRentalCreated();
  }, [onRentalCreated]);

  const { call: requestRental, isRequesting: requesting, error: requestError } = useWriteTransaction(
    createRental, onSuccess
  );

  const handleRequest = React.useCallback(() => {
    if (!selectedSpot) return;
    requestRental({ body: { rentalSpotId: selectedSpot.id, notes: requestNotes } });
  }, [selectedSpot, requestNotes, requestRental]);

  const filteredSpots: RentalSpot[] = typeFilter === "all"
    ? spots
    : spots.filter((s: RentalSpot) => s.rentalTypeId === typeFilter);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6">Available Rental Spots</Typography>
      </Grid>

      {/* Eligibility warnings */}
      {!eligibility.loading && !eligibility.eligible && (
        <Grid item xs={12}>
          {eligibility.reasons.map((reason, i) => (
            <Typography key={i} variant="body2" style={warningBoxStyle}>{reason}</Typography>
          ))}
        </Grid>
      )}

      {/* Type filter */}
      <Grid item xs={12} sm={4}>
        <TextField select fullWidth label="Filter by Type"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          variant="outlined" size="small"
        >
          <MenuItem value="all">All Types</MenuItem>
          {rentalTypes.map((t: RentalType) => (
            <MenuItem key={t.id} value={t.id}>{t.displayName}</MenuItem>
          ))}
        </TextField>
      </Grid>

      {/* Spots grid */}
      <Grid item xs={12}>
        {spotsLoading && <CircularProgress />}
        {spotsError && <ErrorMessage error={spotsError} />}
        {!spotsLoading && filteredSpots.length === 0 && (
          <Typography color="textSecondary">No spots currently available in this category.</Typography>
        )}
        <Grid container spacing={2}>
          {filteredSpots.map((spot: RentalSpot) => (
            <Grid item xs={12} sm={6} md={4} key={spot.id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>{spot.number}</strong>
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {spot.location}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {spot.description}
                  </Typography>
                  <div style={{ marginTop: "8px" }}>
                    <Chip size="small" label={spot.rentalTypeDisplayName || "Unknown"} style={{ marginRight: "4px" }} />
                    {spot.requiresApproval && (
                      <Chip size="small" label="Requires Approval" />
                    )}
                  </div>
                  {spot.invoiceOptionAmount != null && (
                    <Typography variant="body2" style={{ marginTop: "8px" }}>
                      <strong>${spot.invoiceOptionAmount}/mo</strong>
                      {spot.invoiceOptionName && (
                        <span style={{ color: "grey", marginLeft: "6px" }}>({spot.invoiceOptionName})</span>
                      )}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" variant="contained" color="primary"
                    disabled={!eligibility.eligible || eligibility.loading}
                    onClick={() => setSelectedSpot(spot)}
                  >
                    {spot.requiresApproval ? "Request" : "Claim"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Claim / Request modal */}
      {selectedSpot && (
        <FormModal
          id="request-rental-modal" isOpen={!!selectedSpot}
          title={selectedSpot.requiresApproval ? "Request Rental Spot" : "Claim Rental Spot"}
          closeHandler={() => setSelectedSpot(null)}
          onSubmit={handleRequest}
          submitText={selectedSpot.requiresApproval ? "Submit Request" : "Confirm"}
          loading={requesting} error={requestError}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Spot:</strong> {selectedSpot.number} — {selectedSpot.location}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedSpot.description}
              </Typography>
              {selectedSpot.invoiceOptionAmount != null && (
                <Typography variant="body2" style={{ marginTop: "8px" }}>
                  <strong>Cost:</strong> ${selectedSpot.invoiceOptionAmount}/mo
                  {selectedSpot.invoiceOptionName && ` (${selectedSpot.invoiceOptionName})`}
                </Typography>
              )}
            </Grid>
            {selectedSpot.requiresApproval ? (
              <Grid item xs={12}>
                <Typography variant="body2" style={infoBoxStyle}>
                  This spot requires admin approval. You will be notified by email once reviewed.
                </Typography>
                <TextField
                  fullWidth multiline rows={3}
                  label="Notes (optional)"
                  placeholder="Any additional information for your request..."
                  value={requestNotes}
                  onChange={e => setRequestNotes(e.target.value)}
                  variant="outlined"
                />
              </Grid>
            ) : (
              <Grid item xs={12}>
                <Typography variant="body2" style={infoBoxStyle}>
                  An invoice will be generated immediately. You can pay it from your billing tab.
                </Typography>
              </Grid>
            )}
          </Grid>
        </FormModal>
      )}
    </Grid>
  );
};

export default RentalSpotsBrowser;
