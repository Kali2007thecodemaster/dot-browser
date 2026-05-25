import React, { useState, useEffect } from 'react';
import { analyticsSettingsStore } from '@extension/storage';

import type { AnalyticsSettingsConfig } from '@extension/storage';

interface AnalyticsSettingsProps {
  isDarkMode: boolean;
}

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({ isDarkMode: _isDarkMode }) => {
  const [settings, setSettings] = useState<AnalyticsSettingsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await analyticsSettingsStore.getSettings();
        setSettings(currentSettings);
      } catch (error) {
        console.error('Failed to load analytics settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    const unsubscribe = analyticsSettingsStore.subscribe(loadSettings);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleAnalytics = async (enabled: boolean) => {
    if (!settings) return;

    try {
      await analyticsSettingsStore.updateSettings({ enabled });
      setSettings({ ...settings, enabled });
    } catch (error) {
      console.error('Failed to update analytics settings:', error);
    }
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-line bg-surface p-6 text-left">
          <h2 className="mb-4 text-xl font-semibold text-ink">Analytics Settings</h2>
          <div className="animate-pulse">
            <div className="mb-2 h-4 w-3/4 rounded bg-muted/30" />
            <div className="h-4 w-1/2 rounded bg-muted/30" />
          </div>
        </div>
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-line bg-surface p-6 text-left">
          <h2 className="mb-4 text-xl font-semibold text-ink">Analytics Settings</h2>
          <p className="text-sm text-muted">Failed to load analytics settings.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-surface p-6 text-left">
        <h2 className="mb-4 text-xl font-semibold text-ink">Analytics Settings</h2>

        <div className="space-y-6">
          <div className="my-6 rounded-lg border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="analytics-enabled" className="text-base font-medium text-ink">
                Help improve Dot
              </label>
              <div className="relative inline-block w-12 select-none">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => handleToggleAnalytics(e.target.checked)}
                  className="sr-only"
                  id="analytics-enabled"
                />
                <label
                  htmlFor="analytics-enabled"
                  className={`block h-6 cursor-pointer overflow-hidden rounded-full ${settings.enabled ? 'bg-amber' : 'bg-muted'}`}>
                  <span className="sr-only">Toggle analytics</span>
                  <span
                    className={`block size-6 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </label>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">Share anonymous usage data to help us improve the extension</p>
          </div>

          <div className="rounded-md border border-line bg-surface p-4">
            <h3 className="mb-4 text-base font-medium text-ink">What we collect:</h3>
            <ul className="list-disc space-y-2 pl-5 text-left text-sm text-muted">
              <li>Task execution metrics (start, completion, failure counts and duration)</li>
              <li>Domain names of websites visited (e.g., &quot;amazon.com&quot;, not full URLs)</li>
              <li>Error categories for failed tasks (no sensitive details)</li>
              <li>Anonymous usage statistics</li>
            </ul>

            <h3 className="mb-4 mt-6 text-base font-medium text-ink">What we DON&apos;T collect:</h3>
            <ul className="list-disc space-y-2 pl-5 text-left text-sm text-muted">
              <li>Personal information or login credentials</li>
              <li>Full URLs or page content</li>
              <li>Task instructions or user prompts</li>
              <li>Screen recordings or screenshots</li>
              <li>Any sensitive or private data</li>
            </ul>
          </div>

          {!settings.enabled && (
            <div className="rounded-md border border-line bg-surface p-4">
              <p className="text-sm text-muted">
                Analytics disabled. You can re-enable it anytime to help improve Dot.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
