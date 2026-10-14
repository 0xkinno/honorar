import { Nav } from '@/components/Nav';

export const metadata = { title: 'Credits' };

export default function Credits() {
  return (
    <>
      <Nav />
      <main className="wrap page-pad" style={{ maxWidth: 760 }}>
        <p className="kicker">Credits</p>
        <h1 className="h2" style={{ margin: '8px 0 20px' }}>Built by 0xkinno</h1>
        <p>Honorar is built on Arc and Circle Gateway. Typography: Geist, Geist Mono and Instrument Serif, self-hosted.</p>
        <p>Illustrations and the logo are original. No stock photography is used on this build.</p>
      </main>
    </>
  );
}
