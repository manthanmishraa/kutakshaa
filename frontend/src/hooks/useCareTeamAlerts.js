import { useEffect, useState } from 'react';
import { describeApiError, getCareTeamAlerts } from '../utils/api';

export function useCareTeamAlerts() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!localStorage.getItem('kutaksha_token')) {
      setError('Sign in with a backend account to receive alerts across devices.');
      return () => {
        active = false;
      };
    }

    const refresh = async () => {
      try {
        const latest = await getCareTeamAlerts();
        if (active) {
          setNotifications(latest);
          setError('');
        }
      } catch (requestError) {
        if (active) setError(describeApiError(requestError));
      }
    };

    refresh();
    const interval = setInterval(refresh, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { notifications, error };
}
