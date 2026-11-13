import { todayDate } from '../domain/trip';
export function downloadBackup(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `smart-travel-trips-${todayDate()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
