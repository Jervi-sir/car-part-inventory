import axios from 'axios';
export default function TelegramConnect() {
  const connect = async () => {
    const { data } = await axios.post('/notifications/telegram/connect');
    window.open(data.link, '_blank'); // opens t.me/... start=STATE
  };
  const test = async () => { await axios.post('/notifications/telegram/send-test'); alert('Sent'); };
  return (
    <div>
      <button onClick={connect}>Connect Telegram</button>
      <button onClick={test}>Send Test</button>
    </div>
  );
}
