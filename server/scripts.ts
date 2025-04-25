/**
 * This file serves as a wrapper around script functions that need to be used in controllers
 */

import { importUpgradeDowngradeHistory, importRegionUpgradeDowngradeHistory } from './scripts/import-upgrade-downgrade';

export const scripts = {
  importUpgradeDowngradeHistory,
  importRegionUpgradeDowngradeHistory
};