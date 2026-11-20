export function getServerSideProps() {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Dhaka' }).format(new Date());
  return { props: { today } };
}
