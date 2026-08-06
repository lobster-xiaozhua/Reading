import { useTranslation } from "react-i18next";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle={t("error:notFoundDesc")}
      extra={
        <Button
          type="primary"
          onClick={() => navigate("/workbench", { replace: true })}
        >
          {t("error:backToWorkbench")}
        </Button>
      }
    />
  );
}
