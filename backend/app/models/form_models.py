from pydantic import BaseModel 

class EducationModel(BaseModel):
    degree: str 
    branch: str
    institution : str 
    cgpa: float | None 
    start_year: int | None 
    end_year: int | None 
    