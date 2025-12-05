import { faRobot, faSearch, faUserTie } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Button,
  ButtonGroup,
  Input,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  useDisclosure,
} from "@heroui/react";
import { memo } from "react";
import { useTranslation } from "@/i18n";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import AiSettingsModal from "@/components/ai/ai-settings-modal";

const LOGO = () => {
  return (
    <svg fill="none" height="36" viewBox="0 0 32 32" width="36">
      <path
        clipRule="evenodd"
        d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};

function NotebookHeader() {
  const { translate } = useTranslation();
  const { mode, setMode } = useAiAssistant();
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Navbar
        isBordered
        maxWidth="full"
        className="px-8 data-[menu-open=true]:border-solid"
      >
        <NavbarContent justify="start"></NavbarContent>

        <NavbarContent className="hidden sm:flex gap-8" justify="center">
          <NavbarBrand style={{ width: "100px" }}>
            <LOGO />
            <p className="font-bold text-inherit">
              {translate("navbar.title")}
            </p>
          </NavbarBrand>
          <NavbarItem>
            <Input
              labelPlacement="outside"
              placeholder={translate("navbar.searchPlaceholder")}
              startContent={<FontAwesomeIcon icon={faSearch} />}
              variant="bordered"
              style={{ width: "600px", textAlign: "left" }}
            />
          </NavbarItem>
        </NavbarContent>

        <NavbarContent justify="end" style={{ paddingLeft: "10px" }}>
          <ButtonGroup
            size="sm"
            color="primary"
            variant="light"
            style={{ marginRight: "10px" }}
          >
            <Button
              startContent={<FontAwesomeIcon icon={faRobot} />}
              variant={mode === "ai" ? "solid" : "light"}
              onPress={() => setMode("ai")}
            >
              AI模式
            </Button>
            <Button
              startContent={<FontAwesomeIcon icon={faUserTie} />}
              variant={mode === "expert" ? "solid" : "light"}
              onPress={() => setMode("expert")}
            >
              函数说明
            </Button>
          </ButtonGroup>
          <Button variant="bordered" onPress={onOpen}>
            大模型设置
          </Button>
        </NavbarContent>
      </Navbar>
      <AiSettingsModal isOpen={isOpen} onClose={onClose} />
    </>
  );
}

export default memo(NotebookHeader);
