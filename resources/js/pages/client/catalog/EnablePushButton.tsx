// resources/js/components/EnablePushButton.tsx
import React from 'react';
import { enablePush, disablePush, getExistingSubscription } from '@/push';

export default function EnablePushButton() {
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const sub = await getExistingSubscription();
      setEnabled(!!sub);
    })();
  }, []);

  const onEnable = async () => {
    setLoading(true);
    try {
      const sub = await enablePush();
      setEnabled(!!sub);
      if (!sub) alert('Notifications not enabled.');
    } catch (e:any) {
      console.error(e);
      alert(e?.message || 'Failed to enable push');
    } finally {
      setLoading(false);
    }
  };

  const onDisable = async () => {
    setLoading(true);
    try {
      await disablePush();
      setEnabled(false);
    } catch (e:any) {
      console.error(e);
      alert(e?.message || 'Failed to disable push');
    } finally {
      setLoading(false);
    }
  };

  if (enabled === null) return null;

  return enabled ? (
    <button disabled={loading} onClick={onDisable}>
      {loading ? 'Disabling…' : 'Disable Push'}
    </button>
  ) : (
    <button disabled={loading} onClick={onEnable}>
      {loading ? 'Enabling…' : 'Enable Push'}
    </button>
  );
}
