import os
import tempfile
from kaggle.api.kaggle_api_extended import KaggleApi
from datetime import datetime

async def fetch_kaggle_from_token(username: str, token_data: dict):
    try:
        # Create temporary kaggle.json file
        with tempfile.TemporaryDirectory() as tmpdir:
            kaggle_path = os.path.join(tmpdir, "kaggle.json")

            with open(kaggle_path, "w") as f:
                f.write(str(token_data).replace("'", '"'))

            os.environ["KAGGLE_CONFIG_DIR"] = tmpdir

            api = KaggleApi()
            api.authenticate()

            competitions = api.competitions_list_user(username)

            datasets = api.datasets_list(user=username)
            notebooks = api.kernels_list(user=username)

            return {
                "username": username,
                "total_competitions": len(competitions),
                "total_datasets": len(datasets),
                "total_notebooks": len(notebooks),
                "updated_at": datetime.now()
            }

    except Exception as e:
        return {"error": str(e)}