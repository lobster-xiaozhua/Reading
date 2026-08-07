import { useTranslation } from "react-i18next";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="not-found-page">
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
    </div>
  );
}
