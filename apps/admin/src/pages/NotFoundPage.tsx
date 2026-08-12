import { useTranslation } from "react-i18next";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { BrandResult } from "@/components/BrandResult";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="not-found-page">
      <BrandResult
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
