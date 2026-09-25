import os
import pandas as pd
import numpy as np

os.makedirs("sample_data", exist_ok=True)

# 1. Dataset A: Commercial Transactions (Date, Region, Category, Amount, Quantity)
np.random.seed(42)
dates = pd.date_range(start="2024-01-01", periods=100, freq="D").strftime("%Y-%m-%d")
regions = ["North", "South", "East", "West", "Central"]
categories = ["Electronics", "Furniture", "Supplies", "Software"]

data_a = {
    "Transaction_Date": np.random.choice(dates, 120),
    "Region": np.random.choice(regions, 120),
    "Category": np.random.choice(categories, 120),
    "Amount": np.round(np.random.uniform(20.0, 1500.0, 120), 2),
    "Quantity": np.random.randint(1, 15, 120)
}
df_a = pd.DataFrame(data_a)
# Inject 2 missing values and 1 duplicate row
df_a.loc[5, "Amount"] = np.nan
df_a.loc[12, "Region"] = np.nan
df_a = pd.concat([df_a, df_a.iloc[[0]]], ignore_index=True)

with pd.ExcelWriter("sample_data/Dataset_A_Sales.xlsx", engine="openpyxl") as writer:
    df_a.to_excel(writer, sheet_name="Transactions", index=False)
    # Add a second sheet to test multi-sheet workbook support
    df_a_summary = df_a.groupby("Category")["Amount"].sum().reset_index()
    df_a_summary.to_excel(writer, sheet_name="Category Summary", index=False)

print("Created sample_data/Dataset_A_Sales.xlsx")


# 2. Dataset B: HR Personnel (Employee_ID, Department, Age, Salary, Joining_Date, Performance)
emp_ids = [f"EMP-{1000 + i}" for i in range(100)]
depts = ["Engineering", "Sales", "Marketing", "HR", "Finance"]
join_dates = pd.date_range(start="2018-05-15", periods=100, freq="W").strftime("%Y-%m-%d")

data_b = {
    "Employee_ID": emp_ids,
    "Department": np.random.choice(depts, 100),
    "Age": np.random.randint(22, 62, 100),
    "Salary": np.round(np.random.normal(75000, 15000, 100), 2),
    "Joining_Date": join_dates,
    "Performance_Rating": np.random.choice([1, 2, 3, 4, 5], 100)  # Low cardinality integer
}
df_b = pd.DataFrame(data_b)
# Inject an outlier salary
df_b.loc[10, "Salary"] = 450000.0
# Inject 1 missing joining date
df_b.loc[25, "Joining_Date"] = np.nan

df_b.to_excel("sample_data/Dataset_B_Employees.xlsx", index=False)
print("Created sample_data/Dataset_B_Employees.xlsx")


# 3. Dataset C: Student Academic Performance (Student_ID, Name, Course, Marks, Attendance, Gender)
stu_ids = [f"STU_{202400 + i}" for i in range(80)]
names = [f"Student_{i}" for i in range(80)]
courses = ["Computer Science", "Data Science", "Mathematics", "Physics"]
genders = ["Male", "Female", "Other"]

data_c = {
    "Student_ID": stu_ids,
    "Student_Name": names,
    "Course": np.random.choice(courses, 80),
    "Marks": np.round(np.random.uniform(45.0, 99.0, 80), 1),
    "Attendance_Pct": np.round(np.random.uniform(60.0, 100.0, 80), 1),
    "Gender": np.random.choice(genders, 80)
}
df_c = pd.DataFrame(data_c)
df_c.to_excel("sample_data/Dataset_C_Students.xlsx", index=False)
print("Created sample_data/Dataset_C_Students.xlsx")
