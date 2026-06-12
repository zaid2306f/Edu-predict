from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression

MODEL_DIR = Path("trained_models")
MODEL_DIR.mkdir(exist_ok=True)


class MLService:
    def train_performance(self, rows: list[dict]):
        frame = pd.DataFrame(rows)
        X = frame[["attendance", "semester"]]
        y = frame["gpa"]
        rf = RandomForestRegressor(n_estimators=100, random_state=42)
        rf.fit(X, y)
        gb = GradientBoostingRegressor(random_state=42)
        gb.fit(X, y)
        joblib.dump(rf, MODEL_DIR / "performance_rf.joblib")
        joblib.dump(gb, MODEL_DIR / "performance_gb.joblib")
        return {"trained_records": len(frame)}

    def predict_performance(self, attendance: float, semester: int):
        model = joblib.load(MODEL_DIR / "performance_rf.joblib")
        gpa = float(model.predict(np.array([[attendance, semester]]))[0])
        return {"predicted_gpa": round(gpa, 2), "pass_probability": round(max(0, min(1, gpa / 4)), 2), "future_performance": round(gpa * 1.05, 2)}

    def train_dropout(self, rows: list[dict]):
        frame = pd.DataFrame(rows)
        X = frame[["attendance", "gpa"]]
        y = frame["dropout"]
        lr = LogisticRegression(max_iter=500)
        lr.fit(X, y)
        rf = RandomForestClassifier(n_estimators=150, random_state=42)
        rf.fit(X, y)
        joblib.dump(lr, MODEL_DIR / "dropout_lr.joblib")
        joblib.dump(rf, MODEL_DIR / "dropout_xgb_fallback.joblib")
        return {"trained_records": len(frame)}

    def predict_dropout(self, attendance: float, gpa: float):
        model = joblib.load(MODEL_DIR / "dropout_lr.joblib")
        p = float(model.predict_proba(np.array([[attendance, gpa]]))[0][1])
        return {"dropout_probability": round(p, 2)}

    def train_course_demand(self, rows: list[dict]):
        frame = pd.DataFrame(rows)
        X = frame[["semester", "historical_enrollment"]]
        y = frame["future_enrollment"]
        rf = RandomForestRegressor(n_estimators=120, random_state=42)
        rf.fit(X, y)
        joblib.dump(rf, MODEL_DIR / "course_demand_rf.joblib")
        return {"trained_records": len(frame)}

    def predict_course_demand(self, semester: int, historical_enrollment: int):
        model = joblib.load(MODEL_DIR / "course_demand_rf.joblib")
        pred = float(model.predict(np.array([[semester, historical_enrollment]]))[0])
        return {"future_enrollment": round(pred, 2)}

    def anomaly_detection(self, rows: list[dict]):
        frame = pd.DataFrame(rows)
        model = IsolationForest(contamination=0.1, random_state=42)
        labels = model.fit_predict(frame[["attendance", "gpa"]])
        frame["anomaly"] = labels
        anomalies = frame[frame["anomaly"] == -1].to_dict(orient="records")
        return {"anomaly_count": len(anomalies), "anomalies": anomalies}
