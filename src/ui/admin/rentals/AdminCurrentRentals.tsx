import * as React from "react";
import Grid from "@material-ui/core/Grid";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Typography from "@material-ui/core/Typography";
import RentalsList from "ui/rentals/RentalsList";

const AdminCurrentRentals: React.FC = () => {
  const [activeOnly, setActiveOnly] = React.useState(true);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Checkbox
              checked={activeOnly}
              onChange={e => setActiveOnly(e.target.checked)}
              color="primary"
              id="admin-rentals-active-filter"
            />
          }
          label={
            <Typography variant="body2">
              Show active rentals only
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <RentalsList statusFilter={activeOnly ? "active" : undefined} />
      </Grid>
    </Grid>
  );
};

export default AdminCurrentRentals;
