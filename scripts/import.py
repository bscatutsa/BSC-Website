import csv
import urllib.request
from io import StringIO

URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSpK_hr-oa_6Timk4lHs40Nhe0ukT5eU3jWKutavE0uumf73LgIuIbchhPjSscfvdvZZka4_QyTpgQN/pub?gid=1455140197&single=true&output=csv"

response = urllib.request.urlopen(URL)
data = response.read().decode("utf-8")

# save to file
with open("data.csv", "w", encoding="utf-8") as f:
    f.write(data)

print("Saved to data.csv")

with open("data.txt", "w", encoding="utf-8") as f:
    f.write(data)

print("Saved to data.txt")

#for line in data:
#    print(line)
#    for char in line:
#        if "," in line:
#            print (line)


#this file was used to make sure the data was getting read properly, 
#it serves no purpose but to look at data in csv in local environment