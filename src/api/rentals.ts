/**
 * src/api/rentals.ts
 *
 * API functions for rental types, spots, and member/admin rental actions.
 * Uses the same makeRequest/Method pattern as makerspace-ts-api-client.
 * Adjust the import path to match how other files in your project import it.
 */

import { makeRequest, Method } from "makerspace-ts-api-client";
import { RentalType, RentalSpot } from "app/entities/rentalSpot";

// ─── Rental Types ─────────────────────────────────────────────────────────────

export const listRentalTypes = () =>
  makeRequest<RentalType[]>({
    method: Method.Get,
    path:   "/api/rental_types",
  });

export const adminListRentalTypes = () =>
  makeRequest<RentalType[]>({
    method: Method.Get,
    path:   "/api/admin/rental_types",
  });

export const adminCreateRentalType = ({ body }: { body: Partial<RentalType> }) =>
  makeRequest<RentalType>({
    method: Method.Post,
    path:   "/api/admin/rental_types",
    body,
  });

export const adminUpdateRentalType = ({ id, body }: { id: string; body: Partial<RentalType> }) =>
  makeRequest<RentalType>({
    method: Method.Put,
    path:   `/api/admin/rental_types/${id}`,
    body,
  });

export const adminDeleteRentalType = ({ id }: { id: string }) =>
  makeRequest({
    method: Method.Delete,
    path:   `/api/admin/rental_types/${id}`,
  });

// ─── Rental Spots ─────────────────────────────────────────────────────────────

export const listRentalSpots = (params?: { available?: string; rentalTypeId?: string }) =>
  makeRequest<RentalSpot[]>({
    method: Method.Get,
    path:   "/api/rental_spots",
    params,
  });

export const adminListRentalSpots = (params?: Record<string, string>) =>
  makeRequest<RentalSpot[]>({
    method: Method.Get,
    path:   "/api/admin/rental_spots",
    params,
  });

export const adminCreateRentalSpot = ({ body }: { body: Partial<RentalSpot> }) =>
  makeRequest<RentalSpot>({
    method: Method.Post,
    path:   "/api/admin/rental_spots",
    body,
  });

export const adminUpdateRentalSpot = ({ id, body }: { id: string; body: Partial<RentalSpot> }) =>
  makeRequest<RentalSpot>({
    method: Method.Put,
    path:   `/api/admin/rental_spots/${id}`,
    body,
  });

export const adminDeleteRentalSpot = ({ id }: { id: string }) =>
  makeRequest({
    method: Method.Delete,
    path:   `/api/admin/rental_spots/${id}`,
  });

// ─── Member Rentals ───────────────────────────────────────────────────────────

export const createRental = ({ body }: { body: { rentalSpotId: string; notes?: string } }) =>
  makeRequest({
    method: Method.Post,
    path:   "/api/rentals",
    body,
  });

export const cancelRental = ({ id }: { id: string }) =>
  makeRequest({
    method: Method.Delete,
    path:   `/api/rentals/${id}/cancel`,
  });

// ─── Admin Rentals ────────────────────────────────────────────────────────────

export const approveRental = ({ id }: { id: string }) =>
  makeRequest({
    method: Method.Post,
    path:   `/api/admin/rentals/${id}/approve`,
  });

export const denyRental = ({ id, body }: { id: string; body?: { reason?: string } }) =>
  makeRequest({
    method: Method.Post,
    path:   `/api/admin/rentals/${id}/deny`,
    body,
  });
