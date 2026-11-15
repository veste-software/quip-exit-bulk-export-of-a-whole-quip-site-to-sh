import { useState } from 'preact/hooks';
import { longDate, timelineFor } from '../lib/timeline';

export default function TimelineCalc() {
  const [value, setValue] = useState('');
  const t = timelineFor(value.trim());
  const bad = value.trim().length === 10 && !t;
  return (
    <div class="ledger-panel calc">
      <div class="field">
        <label class="label-text field__label" for="term-end">When does your Quip term end?</label>
        <input id="term-end" class="input" type="text" inputMode="numeric" autocomplete="off" placeholder="2027-03-01" value={value} onInput={(e) => setValue((e.target as HTMLInputElement).value)} aria-describedby="term-help" aria-invalid={bad ? 'true' : undefined} />
        <p class="field__help" id="term-help">Year-month-day, from your Salesforce order. Nothing is sent anywhere.</p>
        {bad && <p class="field__error" role="alert">That is not a real date. Use the form 2027-03-01.</p>}
      </div>
      <table class="ledger" aria-live="polite">
        <caption class="label-text">Your dates</caption>
        <tbody>
          <tr><th scope="row">Term ends</th><td class="num">{t ? longDate(t.termEnd) : '–'}</td></tr>
          <tr><th scope="row">Read-only until</th><td class="num">{t ? longDate(t.readOnlyUntil) : '–'}</td></tr>
          <tr><th scope="row">Logins blocked until</th><td class="num">{t ? longDate(t.loginsBlockedUntil) : '–'}</td></tr>
          <tr><th scope="row">Deletion done by about</th><td class="num">{t ? longDate(t.deletionDoneBy) : '–'}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
