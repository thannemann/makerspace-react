import * as React from 'react';
import { Switch, Route, Redirect } from "react-router-dom";

import { Routing, Whitelists } from "app/constants";
import NotFound from "ui/common/NotFound";
import MembersList from "ui/member/MembersList";
import RentalsList from 'ui/rentals/RentalsList';
import EarnedMembershipsList from 'ui/earnedMemberships/EarnedMembershipsList';
import MemberDetail from 'ui/member/MemberDetail';
import CheckoutPage from 'ui/checkout/CheckoutPage';
import BillingContainer from 'ui/billing/BillingContainer';
import SettingsContainer from 'ui/settings/SettingsContainer';
import Receipt from 'ui/checkout/Receipt';
import { Permission } from 'app/entities/permission';
import { CollectionOf } from 'app/interfaces';
import SendRegistrationComponent from 'ui/auth/SendRegistrationComponent';
import AgreementContainer from 'ui/documents/AgreementsContainer';
import UnsubscribeEmails from "ui/member/UnsubscribeEmails";
import { SignUpWorkflow } from 'pages/registration/SignUpWorkflow/SignUpWorkflow';
import AdminRentalsPage from 'ui/admin/rentals/AdminRentalsPage';
import ShopFeesPage from 'ui/shopFees/ShopFeesPage';
import ToolCheckoutsPage from 'ui/toolCheckouts/ToolCheckoutsPage';
import SystemSettings from 'ui/admin/SystemSettings';
import AdminVolunteerPage from 'ui/volunteer/AdminVolunteerPage';

interface Props {
  currentUserId: string,
  permissions: CollectionOf<Permission>,
  isAdmin: boolean;
  isResourceManager: boolean;
  isCheckoutApprover: boolean;
}

const PrivateRouting: React.SFC<Props> = ({ currentUserId, permissions, isAdmin, isResourceManager, isCheckoutApprover }) => {
  const billingEnabled = permissions[Whitelists.billing] || false;
  const earnedMembershipEnabled = isAdmin && permissions[Whitelists.earnedMembership];
  const canManageShopFees = isAdmin || isResourceManager;
  const canManageCheckouts = isAdmin || isResourceManager || isCheckoutApprover;
  const canManageVolunteer = isAdmin || isResourceManager;

  return (
    <Switch>
      <Route exact path={Routing.Members} component={MembersList} />
      <Route exact path={`${Routing.Documents}`} component={AgreementContainer} />
      <Route exact path={Routing.SignUp} component={SignUpWorkflow}/>
      <Route exact path={`${Routing.Settings}/${Routing.PathPlaceholder.Resource}${Routing.PathPlaceholder.Optional}`} component={SettingsContainer} />
      <Route exact path={`${Routing.Profile}/${Routing.PathPlaceholder.Resource}${Routing.PathPlaceholder.Optional}`} component={MemberDetail} />
      <Route exact path={Routing.Rentals} component={RentalsList} />
      {/* Admin/RM rental management */}
      {(isAdmin || isResourceManager) && <Route exact path={Routing.AdminRentals} component={AdminRentalsPage} />}
      {/* Admin/RM shop fee charges */}
      {canManageShopFees && <Route exact path={Routing.ShopFees} component={ShopFeesPage} />}
      {canManageCheckouts && <Route exact path={Routing.ToolCheckouts} component={ToolCheckoutsPage} />}
      {/* Admin/RM volunteer management */}
      {canManageVolunteer && <Route exact path={Routing.Volunteer} component={AdminVolunteerPage} />}
      {isAdmin && <Route exact path={Routing.SystemSettings} component={SystemSettings} />}
      {billingEnabled && <Route exact path={`${Routing.Billing}/${Routing.PathPlaceholder.Resource}${Routing.PathPlaceholder.Optional}`} component={BillingContainer} />}
      {billingEnabled && <Route exact path={Routing.Receipt} component={Receipt}/>}
      {billingEnabled && <Route path={Routing.Checkout} component={CheckoutPage} />}
      <Route exact path={Routing.SendRegistration} component={SendRegistrationComponent}/>
      {earnedMembershipEnabled && <Route exact path={Routing.EarnedMemberships} component={EarnedMembershipsList}/>}
      <Route exact path={Routing.Unsubscribe} component={UnsubscribeEmails} />
      <Redirect to={`${Routing.Members}/${currentUserId}`} />
      <Route component={NotFound} />
    </Switch>
  )
};

export default PrivateRouting;
