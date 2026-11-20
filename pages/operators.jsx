export function getServerSideProps() {
  return { redirect: { destination: '/workspace', permanent: false } };
}

export default function Operators() {
  return null;
}
