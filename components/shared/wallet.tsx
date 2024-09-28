interface WalletProps {
  name: string;
}

const Wallet = ({ name }: WalletProps) => {
  return <span className="uppercase">{name}</span>;
};

export default Wallet;
