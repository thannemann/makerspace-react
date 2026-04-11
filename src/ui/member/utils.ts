import isObject from "lodash-es/isObject";
import { MemberSummary, Member, MemberRole } from "makerspace-ts-api-client";
import { Routing } from "app/constants";
import { timeToDate } from "ui/utils/timeToDate";

export const memberIsAdmin = (member: Member | MemberSummary): boolean => {
  return member && member.role && member.role.includes(MemberRole.Admin);
}

export const memberIsResourceManager = (member: Member | MemberSummary): boolean => {
  return member && member.role === "resource_manager";
}

export const displayMemberExpiration = (member: Member | MemberSummary | number) => {
  const expirationTime = isObject(member) ? (member as MemberSummary).expirationTime : member as number;
  return expirationTime ? timeToDate(expirationTime) : "N/A";
}

export const buildProfileRouting = (memberId: string) => {
  return Routing.Profile.replace(Routing.PathPlaceholder.MemberId, memberId);
};

export const buildNewMemberProfileRoute = (memberId: string) =>
  buildProfileRouting(memberId) + "?newMember=true";
