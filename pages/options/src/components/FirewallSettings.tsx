import { useState, useEffect, useCallback } from 'react';
import { firewallStore } from '@extension/storage';
import { Button } from '@extension/ui';
import { t } from '@extension/i18n';

interface FirewallSettingsProps {
  isDarkMode: boolean;
}

export const FirewallSettings = ({ isDarkMode }: FirewallSettingsProps) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [allowList, setAllowList] = useState<string[]>([]);
  const [denyList, setDenyList] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [activeList, setActiveList] = useState<'allow' | 'deny'>('allow');

  const loadFirewallSettings = useCallback(async () => {
    const settings = await firewallStore.getFirewall();
    setIsEnabled(settings.enabled);
    setAllowList(settings.allowList);
    setDenyList(settings.denyList);
  }, []);

  useEffect(() => {
    loadFirewallSettings();
  }, [loadFirewallSettings]);

  const handleToggleFirewall = async () => {
    await firewallStore.updateFirewall({ enabled: !isEnabled });
    await loadFirewallSettings();
  };

  const handleAddUrl = async () => {
    // Remove http:// or https:// prefixes
    const cleanUrl = newUrl.trim().replace(/^https?:\/\//, '');
    if (!cleanUrl) return;

    if (activeList === 'allow') {
      await firewallStore.addToAllowList(cleanUrl);
    } else {
      await firewallStore.addToDenyList(cleanUrl);
    }
    await loadFirewallSettings();
    setNewUrl('');
  };

  const handleRemoveUrl = async (url: string, listType: 'allow' | 'deny') => {
    if (listType === 'allow') {
      await firewallStore.removeFromAllowList(url);
    } else {
      await firewallStore.removeFromDenyList(url);
    }
    await loadFirewallSettings();
  };

  return (
    <section className="space-y-6">
      <div className={'rounded-lg border border-line bg-surface p-6 text-left'}>
        <h2 className={'mb-4 text-xl font-semibold text-ink'}>{t('options_firewall_header')}</h2>

        <div className="space-y-6">
          <div className={'my-6 rounded-lg border border-line bg-surface p-4'}>
            <div className="flex items-center justify-between">
              <label htmlFor="toggle-firewall" className={'text-base font-medium text-ink'}>
                {t('options_firewall_enableToggle')}
              </label>
              <div className="relative inline-block w-12 select-none">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={handleToggleFirewall}
                  className="sr-only"
                  id="toggle-firewall"
                />
                <label
                  htmlFor="toggle-firewall"
                  className={`block h-6 cursor-pointer overflow-hidden rounded-full ${isEnabled ? 'bg-amber' : 'bg-muted'}`}>
                  <span className="sr-only">{t('options_firewall_toggleFirewall_a11y')}</span>
                  <span
                    className={`block size-6 rounded-full bg-white shadow transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mb-6 mt-10 flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                onClick={() => setActiveList('allow')}
                className={`px-4 py-2 text-sm rounded transition-colors ${activeList === 'allow' ? 'bg-amber text-ground' : 'bg-surface text-muted'}`}>
                {t('options_firewall_allowList_header')}
              </Button>
              <Button
                onClick={() => setActiveList('deny')}
                className={`px-4 py-2 text-sm rounded transition-colors ${activeList === 'deny' ? 'bg-amber text-ground' : 'bg-surface text-muted'}`}>
                {t('options_firewall_denyList_header')}
              </Button>
            </div>
          </div>

          <div className="mb-4 flex space-x-2">
            <input
              id="url-input"
              type="text"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddUrl();
                }
              }}
              placeholder={t('options_firewall_placeholders_domainUrl')}
              className={
                'flex-1 rounded border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-amber focus:outline-none'
              }
            />
            <Button
              onClick={handleAddUrl}
              className={`px-4 py-2 text-sm ${
                isDarkMode ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-500 text-white hover:bg-green-600'
              }`}>
              {t('options_firewall_btnAdd')}
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {activeList === 'allow' ? (
              allowList.length > 0 ? (
                <ul className="space-y-2">
                  {allowList.map(url => (
                    <li key={url} className={'flex items-center justify-between rounded p-2 pr-0 bg-surface'}>
                      <span className={'text-sm text-ink'}>{url}</span>
                      <Button
                        onClick={() => handleRemoveUrl(url, 'allow')}
                        className={`rounded-l-none px-2 py-1 text-xs ${
                          isDarkMode
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}>
                        {t('options_firewall_btnRemove')}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('options_firewall_allowList_empty')}
                </p>
              )
            ) : denyList.length > 0 ? (
              <ul className="space-y-2">
                {denyList.map(url => (
                  <li
                    key={url}
                    className={`flex items-center justify-between rounded-md p-2 pr-0 ${
                      isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
                    }`}>
                    <span className={'text-sm text-ink'}>{url}</span>
                    <Button
                      onClick={() => handleRemoveUrl(url, 'deny')}
                      className={`rounded-l-none px-2 py-1 text-xs ${
                        isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'
                      }`}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('options_firewall_denyList_empty')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={'rounded-lg border border-line bg-surface p-6 text-left'}>
        <h2 className={'mb-4 text-xl font-semibold text-ink'}>{t('options_firewall_howItWorks_header')}</h2>
        <ul className={`list-disc space-y-2 pl-5 text-left text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {t('options_firewall_howItWorks')
            .split('\n')
            .map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
        </ul>
      </div>
    </section>
  );
};
