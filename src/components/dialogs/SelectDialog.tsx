import { ChangeEvent, useEffect, useState } from "react";
import CustomDialog from "./CustomDialog";
import OutlinedButton from "../buttons/OutlinedButton";
import FilledButton from "../buttons/FilledButton";
import MainInput from "../form/MainInput";
import { Icon } from "@iconify/react";
import { TOKENS } from "../../utils/consts";
interface IProps {
  visible: boolean;
  setVisible: Function;
  sourceToken: IToken;
  targetToken: IToken;
  setSource: Function;
  setTarget: Function;
  catagory: string;
}

export default function SelectDialog({
  visible,
  setVisible,
  sourceToken,
  targetToken,
  setSource,
  setTarget,
  catagory,
}: IProps) {
  const [tokenFilter, setTokenFilter] = useState<string>("");
  const [tokenFilteredTokens, setFilteredTokens] = useState<IToken[]>(TOKENS);
  useEffect(() => {
    console.log("catagory------", catagory);
    const filteredTokens = TOKENS.filter((token) =>
      token.id.toLowerCase().includes(tokenFilter.toLowerCase())
    );
    setFilteredTokens(filteredTokens);
  }, [tokenFilter]);
  const handleFilterChanged = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTokenFilter(value);
  };

  const handleSelectToken = (token: IToken) => {
    if (token === sourceToken || token === targetToken) return;
    if (catagory === "source") setSource(token);
    else setTarget(token);
    setVisible(false);
  };

  return (
    <CustomDialog
      title="Select Token"
      visible={visible}
      setVisible={setVisible}
    >
      <div className="py-6 bg-gray-900 rounded-md flex flex-col gap-16">
        <MainInput
          startAdornment={
            <Icon
              icon="material-names:search"
              className="text-gray-700 text-lg"
            />
          }
          value={tokenFilter}
          placeholder="Search by name"
          onChange={handleFilterChanged}
        />
      </div>

      <div className="overflow-y-auto h-[50vh]">
        {tokenFilteredTokens.map((token) => (
          <div
            className={`modal-token-item ${
              (token.id === sourceToken.id || token.id === targetToken.id) &&
              "disabled"
            }`}
            onClick={() => handleSelectToken(token)}
            key={token.id}
          >
            <img
              src={token.image}
              alt={`${token.id} logo`}
              width="40"
              height="40"
              className="w-10 h-10 p-1 bg-white rounded-full"
              loading="lazy"
            />
            <p className="flex flex-col font-medium">
              {token.id} <span className="modal-token-name">{token.name}</span>
            </p>
          </div>
        ))}
      </div>
    </CustomDialog>
  );
}
