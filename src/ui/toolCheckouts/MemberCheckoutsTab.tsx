import * as React from "react";
import { Member } from "makerspace-ts-api-client";
import CheckoutRoster from "ui/toolCheckouts/CheckoutRoster";
import { useAuthState } from "ui/reducer/hooks";
import { memberIsAdmin, memberIsResourceManager } from "ui/member/utils";

interface Props {
  member: Member;
}

const MemberCheckoutsTab: React.FC<Props> = ({ member }) => {
  const { currentUser } = useAuthState();
  const isAdmin = memberIsAdmin(currentUser);
  const isRM = memberIsResourceManager(currentUser);

  return (
    <CheckoutRoster
      preselectedMember={{ id: member.id, name: `${member.firstname} ${member.lastname}` }}
      isAdmin={isAdmin}
      isResourceManager={isRM}
    />
  );
};

export default MemberCheckoutsTab;
