import { Route, Routes } from 'react-router';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/app/layouts/app-layout';
import { LandingPage } from '@/features/discovery/pages/landing-page';
import { SettingsPage } from '@/features/foundation/settings-page';
import { PageLoading } from '@/components/feedback/page-loading';
import { NotFoundPage } from '@/features/foundation/not-found-page';

const BudgetPage = lazy(() =>
  import('@/features/budget/pages/budget-page').then((m) => ({ default: m.BudgetPage })),
);
const DesignSystemPage = lazy(() =>
  import('@/features/foundation/design-system-page').then((module) => ({
    default: module.DesignSystemPage,
  })),
);
const ExplorerPage = lazy(() =>
  import('@/features/discovery/pages/explorer-page').then((module) => ({
    default: module.ExplorerPage,
  })),
);
const DestinationPage = lazy(() =>
  import('@/features/discovery/pages/destination-page').then((module) => ({
    default: module.DestinationPage,
  })),
);
const SavedPage = lazy(() =>
  import('@/features/discovery/pages/saved-page').then((module) => ({ default: module.SavedPage })),
);
const DashboardPage = lazy(() =>
  import('@/features/trips/pages/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
);
const WizardPage = lazy(() =>
  import('@/features/trips/pages/wizard-page').then((module) => ({ default: module.WizardPage })),
);
const TripOverviewPage = lazy(() =>
  import('@/features/trips/pages/trip-overview-page').then((module) => ({
    default: module.TripOverviewPage,
  })),
);
const ItineraryPage = lazy(() =>
  import('@/features/itinerary/pages/itinerary-page').then((module) => ({
    default: module.ItineraryPage,
  })),
);

const OrganizerPage = lazy(() =>
  import('@/features/organizer/pages/organizer-page').then((module) => ({
    default: module.OrganizerPage,
  })),
);
const PrintPage = lazy(() =>
  import('@/features/organizer/pages/print-page').then((module) => ({ default: module.PrintPage })),
);
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route
          path="discover"
          element={
            <Suspense fallback={<PageLoading />}>
              <ExplorerPage />
            </Suspense>
          }
        />
        <Route
          path="destinations/:destinationId"
          element={
            <Suspense fallback={<PageLoading />}>
              <DestinationPage />
            </Suspense>
          }
        />
        <Route
          path="trips"
          element={
            <Suspense fallback={<PageLoading />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="trips/new"
          element={
            <Suspense fallback={<PageLoading />}>
              <WizardPage />
            </Suspense>
          }
        />
        <Route
          path="trips/:tripId"
          element={
            <Suspense fallback={<PageLoading />}>
              <TripOverviewPage />
            </Suspense>
          }
        />
        <Route
          path="trips/:tripId/edit"
          element={
            <Suspense fallback={<PageLoading />}>
              <WizardPage />
            </Suspense>
          }
        />
        <Route
          path="trips/:tripId/itinerary"
          element={
            <Suspense fallback={<PageLoading />}>
              <ItineraryPage />
            </Suspense>
          }
        />
        <Route
          path="saved"
          element={
            <Suspense fallback={<PageLoading />}>
              <SavedPage />
            </Suspense>
          }
        />
        <Route
          path="trips/:tripId/organizer"
          element={
            <Suspense fallback={<PageLoading />}>
              <OrganizerPage />
            </Suspense>
          }
        />
        <Route
          path="trips/:tripId/print"
          element={
            <Suspense fallback={<PageLoading />}>
              <PrintPage />
            </Suspense>
          }
        />
        <Route
          path="trips/:tripId/budget"
          element={
            <Suspense fallback={<PageLoading />}>
              <BudgetPage />
            </Suspense>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="design-system"
          element={
            <Suspense fallback={<PageLoading />}>
              <DesignSystemPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
