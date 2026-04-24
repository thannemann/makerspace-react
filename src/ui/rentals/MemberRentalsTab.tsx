import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Divider from "@material-ui/core/Divider";
import { Member } from "makerspace-ts-api-client";

import MemberRentalsList from "ui/rentals/MemberRentalsList";
import RentalSpotsBrowser from "ui/rentalSpots/RentalSpotsBrowser";
import { useAuthState } from "ui/reducer/hooks";

interface Props {
  member:    Member;
  onUpdate?: () => void;
}

const MemberRentalsTab: React.FC<Props> = ({ member, onUpdate }) => {
  const { currentUser: { id: currentUserId } } = useAuthState();
  const isOwnProfile = currentUserId === member.id;

  const [browserKey, setBrowserKey] = React.useState(0);

  const handleRentalCreated = React.useCallback(() => {
    setBrowserKey(k => k + 1);
    onUpdate?.();
  }, [onUpdate]);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <MemberRentalsList member={member} onUpdate={onUpdate} />
      </Grid>

      {isOwnProfile && (
        <>
          <Grid item xs={12}>
            <Divider />
          </Grid>
          <Grid item xs={12}>
            <RentalSpotsBrowser
              key={browserKey}
              member={member}
              onRentalCreated={handleRentalCreated}
            />
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default MemberRentalsTab;
