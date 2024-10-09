export default async function Page({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Wallet</h1>
      <h2>Labels</h2>
      <h2>Members</h2>
      <h2>Configuration</h2>
      <ul>
        <li>Visibility</li>
        <li>Currency</li>
      </ul>
      <h2>Export</h2>
      <h2>Import</h2>
    </div>
  );
}
